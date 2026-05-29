async function generateReceipt() {
  var $tbody = $("#dataList");
  if ($tbody.length === 0) {
    alert(
      "#dataList 를 찾을 수 없습니다. 상품 구매 내역 페이지에서 실행하세요.",
    );
    return;
  }

  // 분류 사전 위치 (본인 GitHub Pages)
  var PRODUCT_INFO_URL =
    "https://devhante.github.io/ffxiv-kr-shop-receipt/product-info.json";

  function toNum(v) {
    return parseInt(String(v == null ? 0 : v).replace(/,/g, ""), 10) || 0;
  }
  function comma(n) {
    return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }
  function pad(n) {
    return ("0" + n).slice(-2);
  }
  function stateLabel(code) {
    return (
      {
        R: "청약철회",
        U: "이용권",
        D: "계정 지급",
        I: "아이템 보관함",
        M: "모그레터 발송",
        S: "서버 이전 정보",
      }[code] || "부가서비스"
    );
  }

  $tbody.html('<tr><td colspan="4">분류 데이터 불러오는 중…</td></tr>');

  // ── 분류 사전 로드 ──
  var productMap = {};
  try {
    productMap = await (await fetch(PRODUCT_INFO_URL)).json();
  } catch (e) {
    alert("분류 데이터를 불러오지 못했습니다: " + e);
    return;
  }

  // product-info.json의 세부 분류 → 화면 표시용 12종으로 묶기
  var GROUP = {
    이용권: "이용권",
    환상약: "환상약",
    "집사 고용권": "부가서비스",
    "초코보 가방 이용권": "부가서비스",
    변경권: "부가서비스",
    의상: "의상",
    헤어카탈로그: "의상",
    "무기/패션 소품": "의상",
    "머리/장신구/얼굴 치장": "의상",
    염료: "염료",
    탈것: "탈것",
    "감정 표현": "감정 표현",
    "꼬마 친구": "꼬마 친구",
    "오케스트리온 악보": "오케스트리온 악보",
    하우징: "하우징",
    // 위 목록에 없는 분류(모험록·영원한 언약식·디지털 콜렉터·초코보 갑주·모험가 지원 세트 등)는 '기타'
  };

  // 사전에 상품명이 있으면 → 12종으로 묶기(없는 분류는 기타),
  // 사전에 상품명 자체가 없으면 → 미분류
  function categorize(name) {
    if (!name || !Object.prototype.hasOwnProperty.call(productMap, name))
      return "미분류";
    return GROUP[productMap[name]] || "기타";
  }

  // 12분류별 행 배경색 (이용권=부가서비스, 의상=염료, 탈것=꼬마 친구는 같은 색)
  var COLOR = {
    이용권: "#FFEAEA", // 이용권·부가서비스 같은 색 (연빨강)
    부가서비스: "#FFEAEA",
    환상약: "#E1F0FF", // 하늘색
    의상: "#E1EDD1", // 의상·염료 같은 색 (연두)
    염료: "#E1EDD1",
    탈것: "#FFF3D6", // 탈것·꼬마 친구 같은 색 (연노랑)
    "꼬마 친구": "#FFF3D6",
    "감정 표현": "#FCE4EC", // 분홍
    "오케스트리온 악보": "#EDE7F6", // 연보라
    하우징: "#E0F2F1", // 청록
    기타: "#ECEFF1", // 회색빛
    미분류: "", // 색 없음
  };

  // ── 조회: 연 단위(서버 1년 제한) × 페이지네이션 ──
  var counts = {},
    values = {};
  var totalCount = 0,
    totalValue = 0,
    refundCount = 0,
    refundValue = 0;
  var etcNames = {},
    allRecords = [],
    rowsHtml = "";

  $tbody.html(
    '<tr><td colspan="4">전체 기간 조회 중… 잠시만 기다려 주세요.</td></tr>',
  );

  var now = new Date(),
    thisYear = now.getFullYear();
  for (var year = 2015; year <= thisYear; year++) {
    var startDate = year + "-01-01";
    var endDate =
      year === thisYear
        ? thisYear + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate())
        : year + "-12-31";

    var pageNo = 1,
      maxPage = 300;
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
            var name = item.packageName || "";
            var date = item.resultDate || "";
            var priceStr = item.price || "0";
            var priceNum = toNum(priceStr);
            var code = item.resultCode || "";

            allRecords.push({
              packageName: name,
              price: priceStr,
              resultDate: date,
              resultCode: code,
            });

            var bg;
            if (code === "R") {
              refundCount += 1;
              refundValue += priceNum;
              bg = "#F0F0F0";
            } else {
              var cat = categorize(name);
              counts[cat] = (counts[cat] || 0) + 1;
              values[cat] = (values[cat] || 0) + priceNum;
              totalCount += 1;
              totalValue += priceNum;
              if (cat === "미분류") etcNames[name] = (etcNames[name] || 0) + 1;
              bg = COLOR[cat] || "";
            }

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
        error: function (xhr) {
          alert(xhr.responseText);
          stop = true;
        },
      });
      if (stop) break;
      pageNo++;
    }
  }

  // ── 합계 섹션 ──
  function sumRow(label, cnt, val) {
    var bg = COLOR[label] || "#fafafa";
    return (
      '<tr style="font-weight:bold;background:' +
      bg +
      ';"><td>' +
      label +
      "</td>" +
      '<td class="txt_c5">' +
      comma(cnt) +
      "건</td>" +
      '<td class="txt_c5">' +
      comma(val) +
      ' 크리스탈</td><td class="txt_c5">-</td></tr>'
    );
  }
  rowsHtml +=
    '<tr style="font-weight:bold;background:#dfe7ff;"><td>총 합계</td>' +
    '<td class="txt_c5">' +
    comma(totalCount) +
    "건</td>" +
    '<td class="txt_c5">' +
    comma(totalValue) +
    ' 크리스탈</td><td class="txt_c5">-</td></tr>';

  var ORDER = [
    "이용권",
    "환상약",
    "부가서비스",
    "의상",
    "염료",
    "탈것",
    "감정 표현",
    "꼬마 친구",
    "오케스트리온 악보",
    "하우징",
    "기타",
    "미분류",
  ];
  ORDER.forEach(function (cat) {
    if (counts[cat] > 0) rowsHtml += sumRow(cat, counts[cat], values[cat]);
  });

  if (refundCount > 0) {
    rowsHtml +=
      '<tr style="font-weight:bold;background:#F0F0F0;color:#999;"><td>청약철회 (합계 제외)</td>' +
      '<td class="txt_c5">' +
      comma(refundCount) +
      "건</td>" +
      '<td class="txt_c5">' +
      comma(refundValue) +
      ' 크리스탈</td><td class="txt_c5">-</td></tr>';
  }

  $tbody.html(rowsHtml);

  // ── 미분류 목록 콘솔 출력 ──
  var etcList = Object.keys(etcNames).map(function (n) {
    return n + " (" + etcNames[n] + ")";
  });
  if (etcList.length > 0)
    console.log("[미분류 " + etcList.length + "종]\n" + etcList.join("\n"));
  else console.log("미분류 없음 — 모두 분류되었습니다.");

  // ── 안내 + 내보내기 박스 ──
  var exportJson = JSON.stringify(allRecords, null, 2);
  window.__ff14_export = allRecords;
  window.__ff14_etc = etcList;
  $("#ff14ExportBox").remove();
  $("#ff14NoticeBox").remove();

  var etcHtml =
    etcList.length > 0
      ? '<div style="margin-top:10px;color:#a33;font-size:12px;">사전에 없어 "미분류"로 처리된 상품 ' +
        etcList.length +
        "종이 있습니다 (콘솔에서 목록 확인 가능). product-info.json에 추가하면 분류됩니다.</div>"
      : "";

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
    etcHtml +
    '  <div style="margin-top:10px;color:#777;font-size:12px;">복사가 안 되면 아래 칸을 전체 선택(Ctrl+A) 후 복사(Ctrl+C)해서 전달해 주세요.</div>' +
    '  <textarea id="ff14ExportArea" readonly style="margin-top:8px;width:100%;height:120px;font-family:monospace;font-size:12px;box-sizing:border-box;"></textarea>' +
    '  <div style="margin-top:10px;color:#aaa;font-size:11px;text-align:right;">이 코드는 Claude의 도움을 받아 작성하였습니다.</div>' +
    "</div>";

  var $anchor = $("table.tbl_type2").first();
  if ($anchor.length) $anchor.before(boxHtml);
  else $tbody.closest("table").before(boxHtml);
  $("#ff14ExportArea").val(exportJson);

  function showMsg(t) {
    $("#ff14CopyMsg").text(t);
    setTimeout(function () {
      $("#ff14CopyMsg").text("");
    }, 3000);
  }
  $("#ff14CopyBtn").on("click", function () {
    var ok = function () {
      showMsg("✅ 복사됨! (" + allRecords.length + "건)");
    };
    var fail = function () {
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
    if (navigator.clipboard && navigator.clipboard.writeText)
      navigator.clipboard.writeText(exportJson).then(ok).catch(fail);
    else fail();
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

generateReceipt();
