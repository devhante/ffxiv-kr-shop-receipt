function SearchEx() {
  // ── 렌더 타깃: 새 페이지의 결과 tbody ──
  var $tbody = $("#dataList");
  if ($tbody.length === 0) {
    alert(
      "#dataList 를 찾을 수 없습니다. 상품 구매 내역 페이지에서 실행하세요.",
    );
    return;
  }

  // 카테고리별 개수 / 금액
  var counts = {
    hwanjang: 0,
    action: 0,
    sebasuchan: 0,
    daily: 0,
    time: 0,
    riding: 0,
    dress: 0,
    bag: 0,
    expansion: 0,
    etc: 0,
  };
  var values = {
    hwanjang: 0,
    action: 0,
    sebasuchan: 0,
    daily: 0,
    time: 0,
    riding: 0,
    dress: 0,
    bag: 0,
    expansion: 0,
    etc: 0,
  };
  var totalValance = 0;
  var refundCount = 0,
    refundValue = 0; // 청약철회(R) 별도 집계 — 합계에서 제외

  var allRecords = []; // ★ 내보내기용 원본 List 데이터 누적

  // ── 분류 키워드 (전체 카탈로그 대응) ──
  var ridingKeys = [
    "피리",
    "나팔",
    "열쇠",
    "마도 아머",
    "두운의 서",
    "빗자루",
    "양탄자",
    "원조 뚱보초코보",
    "호루라기",
    "공명기",
    "비행 의자",
  ];
  var dressKeys = [
    "의상",
    "앞치마",
    "가인 세트",
    "공자 세트",
    "제작자 세트",
    "채집가 세트",
    "성부군 세트",
    "실내화",
    "노라 세트",
    "점퍼",
    "의복 세트",
    "무관 세트",
    "여관 세트",
    "조끼",
    "반바지",
    "원피스",
    "하의",
    "수영복",
    "유카타",
    "별빛 축제 세트",
    "영혼",
    "양파기사 세트",
    "신발",
    "별빛 로브",
    "가인 패키지",
    "교복",
    "얼굴 치장 카탈로그",
    "정장",
    "겉옷",
    "버선",
  ];

  function categorize(name) {
    if (!name) return "etc";
    if (name.indexOf("환상약") > -1 || name.indexOf("사랑의 묘약") > -1)
      return "hwanjang";
    if (name.indexOf("연기") > -1) return "action";
    if (name.indexOf("고용권") > -1) return "sebasuchan"; // 집사 (이용권보다 먼저)
    if (name.indexOf("가방") > -1) return "bag"; // 초코보 가방 (이용권보다 먼저)
    if (name.indexOf("시간 이용권") > -1) return "time"; // 정량제
    if (name.indexOf("이용권") > -1) return "daily"; // 정액제
    for (var r = 0; r < ridingKeys.length; r++)
      if (name.indexOf(ridingKeys[r]) > -1) return "riding";
    for (var d = 0; d < dressKeys.length; d++)
      if (name.indexOf(dressKeys[d]) > -1) return "dress";
    if (name.indexOf("유산") > -1) return "expansion"; // 황금의 유산 등 확장팩
    return "etc";
  }

  var rowColor = {
    hwanjang: "#FEC",
    action: "#FFFFD7",
    sebasuchan: "#EBF7FF",
    daily: "#FFEAEA",
    time: "#FAEBFF",
    riding: "#E1E6FF",
    dress: "#E1EDD1",
    bag: "#FFF3E0",
    expansion: "#EDE7F6",
    etc: "",
  };

  // resultCode → 상태 라벨 (페이지 로직과 동일)
  function stateLabel(code) {
    switch (code) {
      case "R":
        return "청약철회";
      case "U":
        return "이용권";
      case "D":
        return "계정 지급";
      case "I":
        return "아이템 보관함";
      case "M":
        return "모그레터 발송";
      case "S":
        return "서버 이전 정보";
      default:
        return "부가서비스";
    }
  }

  function toNum(v) {
    return parseInt(String(v == null ? 0 : v).replace(/,/g, ""), 10) || 0;
  }
  function comma(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function pad(n) {
    return ("0" + n).slice(-2);
  }

  $tbody.html(
    '<tr><td colspan="4">전체 기간 조회 중… 잠시만 기다려 주세요.</td></tr>',
  );

  // ── 조회 기간: 연 단위로 끊어서 호출 (서버 1년 제한 대응) ──
  var rowsHtml = "";
  var now = new Date();
  var thisYear = now.getFullYear();
  var firstYear = 2015; // 달력 minDate 기준

  for (var year = firstYear; year <= thisYear; year++) {
    var startDate = year + "-01-01";
    var endDate =
      year === thisYear
        ? thisYear + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate())
        : year + "-12-31";

    var pageNo = 1;
    var maxPage = 300; // 무한루프 안전장치

    while (pageNo <= maxPage) {
      var stop = false;

      $.ajax({
        url: "/shop/myShop/GetBuyListAdd",
        async: false,
        type: "post",
        data: { startDate: startDate, endDate: endDate, PageNo: pageNo },
        success: function (res) {
          var list = res && res.List ? res.List : Array.isArray(res) ? res : [];
          if (!list || list.length === 0) {
            stop = true;
            return;
          }

          for (var i = 0; i < list.length; i++) {
            var item = list[i];
            // ★ 개인정보 제외: 분류에 필요한 필드만 수집
            //    (charname / currServerName / moveServerName / giftMessage 등은 제외)
            allRecords.push({
              packageName: item.packageName,
              price: item.price,
              resultDate: item.resultDate,
              resultCode: item.resultCode,
            });
            var name = item.packageName || "";
            var date = item.resultDate || "";
            var priceStr = item.price || "0";
            var priceNum = toNum(priceStr);
            var code = item.resultCode || "";
            var cat = categorize(name);

            if (code === "R") {
              // 청약철회: 목록에는 표시하되 합계에서는 제외
              refundCount += 1;
              refundValue += priceNum;
            } else {
              if (cat === "hwanjang") {
                if (name.indexOf("환상약 5") > -1) counts.hwanjang += 5;
                else if (name.indexOf("환상약 3") > -1) counts.hwanjang += 3;
                else counts.hwanjang += 1;
              } else {
                counts[cat] += 1;
              }
              values[cat] += priceNum;
              totalValance += priceNum;
            }

            var bg = code === "R" ? "#F0F0F0" : rowColor[cat];
            rowsHtml += bg ? '<tr style="background:' + bg + ';">' : "<tr>";
            rowsHtml += "<td>" + date + ' <span class="mo"></span></td>';
            rowsHtml +=
              '<td data-title data-padding3><span class="txt_c5" title="' +
              name +
              '"> ' +
              name +
              "</span></td>";
            rowsHtml +=
              '<td class="txt_c5" data-price>' + priceStr + " 크리스탈</td>";
            rowsHtml +=
              '<td class="txt_c5" data-state>' + stateLabel(code) + "</td>";
            rowsHtml += "</tr>";
          }
        },
        error: function (xhr, textStatus, errorThrown) {
          alert(xhr.responseText);
          stop = true;
        },
      });

      if (stop) break;
      pageNo++;
    }
  }

  // ── 합계 행 ──
  function sumRow(label, cnt, val) {
    return (
      '<tr style="font-weight:bold;background:#fafafa;">' +
      "<td>" +
      label +
      "</td>" +
      '<td class="txt_c5">' +
      comma(cnt) +
      "건</td>" +
      '<td class="txt_c5">' +
      comma(val) +
      " 크리스탈</td>" +
      '<td class="txt_c5">-</td></tr>'
    );
  }

  var totalCnt =
    counts.daily +
    counts.time +
    counts.hwanjang +
    counts.action +
    counts.sebasuchan +
    counts.bag +
    counts.riding +
    counts.dress +
    counts.expansion +
    counts.etc;

  rowsHtml +=
    '<tr style="font-weight:bold;background:#eef;"><td>총 합계</td>' +
    '<td class="txt_c5">' +
    comma(totalCnt) +
    "건</td>" +
    '<td class="txt_c5">' +
    comma(totalValance) +
    " 크리스탈</td>" +
    '<td class="txt_c5">-</td></tr>';

  rowsHtml += sumRow("정액제 결제", counts.daily, values.daily);
  rowsHtml += sumRow("정량제 결제", counts.time, values.time);
  rowsHtml += sumRow("환상약", counts.hwanjang, values.hwanjang);
  rowsHtml += sumRow("연기 교본", counts.action, values.action);
  rowsHtml += sumRow("집사 고용", counts.sebasuchan, values.sebasuchan);
  rowsHtml += sumRow("초코보 가방", counts.bag, values.bag);
  rowsHtml += sumRow("탈것", counts.riding, values.riding);
  rowsHtml += sumRow("의상", counts.dress, values.dress);
  rowsHtml += sumRow("확장팩", counts.expansion, values.expansion);
  if (counts.etc > 0) rowsHtml += sumRow("기타", counts.etc, values.etc);
  if (refundCount > 0) {
    rowsHtml +=
      '<tr style="font-weight:bold;background:#F0F0F0;color:#999;"><td>청약철회 (합계 제외)</td>' +
      '<td class="txt_c5">' +
      comma(refundCount) +
      "건</td>" +
      '<td class="txt_c5">' +
      comma(refundValue) +
      " 크리스탈</td>" +
      '<td class="txt_c5">-</td></tr>';
  }

  $tbody.html(rowsHtml);

  // ─────────────────────────────────────────────────────────────
  //  내보내기(복사) 버튼: 원본 List 데이터를 JSON으로 클립보드 복사
  // ─────────────────────────────────────────────────────────────
  var exportJson = JSON.stringify(allRecords, null, 2);
  window.__ff14_export = allRecords; // 콘솔에서도 접근 가능

  $("#ff14ExportBox").remove(); // 중복 실행 시 정리
  $("#ff14NoticeBox").remove();

  var boxHtml =
    "" +
    '<div id="ff14NoticeBox" style="margin:16px 0 0;padding:14px 16px;border:2px solid #e0a000;border-radius:8px;background:#fffbe6;font-size:14px;line-height:1.6;">' +
    '  <div style="font-weight:bold;margin-bottom:6px;">⚠️ 꼭 읽어 주세요</div>' +
    "  <div>이 코드를 실행할 때마다 파이널판타지14 홈페이지에 구매 내역을 요청하게 됩니다. 즉, 실행하는 것 자체가 게임 회사의 서버를 사용하는 일입니다.</div>" +
    '  <div style="margin-top:6px;">같은 코드를 여러 번 반복해서 돌리면 홈페이지에 불필요한 부담을 주게 되니, <b>한 번만 실행</b>해 주세요.</div>' +
    "</div>" +
    '<div id="ff14ExportBox" style="margin:12px 0 16px;padding:16px;border:2px solid #4a6;border-radius:8px;background:#f6fff6;font-size:14px;">' +
    '  <div style="margin-bottom:10px;font-weight:bold;">📦 수집된 구매 내역 <span style="color:#2a7;">' +
    allRecords.length +
    '건</span> <span style="color:#888;font-weight:normal;font-size:12px;">(개인정보 제외: 상품명·가격·날짜·구분코드만)</span></div>' +
    '  <button id="ff14CopyBtn" type="button" style="cursor:pointer;padding:10px 18px;border:0;border-radius:6px;background:#2a7;color:#fff;font-size:14px;font-weight:bold;">데이터 복사하기</button>' +
    '  <button id="ff14DownBtn" type="button" style="cursor:pointer;margin-left:8px;padding:10px 18px;border:1px solid #2a7;border-radius:6px;background:#fff;color:#2a7;font-size:14px;font-weight:bold;">파일로 저장</button>' +
    '  <span id="ff14CopyMsg" style="margin-left:12px;color:#2a7;"></span>' +
    '  <div style="margin-top:10px;color:#777;font-size:12px;">복사가 안 되면 아래 칸을 전체 선택(Ctrl+A) 후 복사(Ctrl+C)해서 전달해 주세요.</div>' +
    '  <textarea id="ff14ExportArea" readonly style="margin-top:8px;width:100%;height:120px;font-family:monospace;font-size:12px;box-sizing:border-box;"></textarea>' +
    '  <div style="margin-top:10px;color:#aaa;font-size:11px;text-align:right;">이 코드는 Claude의 도움을 받아 작성하였습니다.</div>' +
    "</div>";

  // 결과 테이블 바로 위에 삽입
  var $anchor = $("table.tbl_type2").first();
  if ($anchor.length) $anchor.before(boxHtml);
  else $tbody.closest("table").before(boxHtml);

  $("#ff14ExportArea").val(exportJson);

  function showMsg(text) {
    $("#ff14CopyMsg").text(text);
    setTimeout(function () {
      $("#ff14CopyMsg").text("");
    }, 3000);
  }

  $("#ff14CopyBtn").on("click", function () {
    var ok = function () {
      showMsg("✅ 복사됨! (" + allRecords.length + "건)");
    };
    var fail = function () {
      // 폴백: textarea 선택 후 execCommand
      var ta = document.getElementById("ff14ExportArea");
      ta.focus();
      ta.select();
      try {
        document.execCommand("copy");
        showMsg("✅ 복사됨! (" + allRecords.length + "건)");
      } catch (e) {
        showMsg("⚠️ 자동 복사 실패 — 아래 칸에서 직접 복사해 주세요.");
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(exportJson).then(ok).catch(fail);
    } else {
      fail();
    }
  });

  $("#ff14DownBtn").on("click", function () {
    var blob = new Blob([exportJson], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download =
      "ff14_buylist_" + new Date().toISOString().slice(0, 10) + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showMsg("💾 파일 저장됨");
  });
}

SearchEx();
