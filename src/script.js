var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
var standingsDiv = document.getElementById("bottomtable-bottomtable");
var content = document.getElementById("righttable-content");
var chat = document.querySelector("chat-chat");
// panel with vote/standings/schedule buttons
var btnPanel = standingsDiv.querySelector(".selection-panel-container");
// button with text "Standings"
var standingsBtn = btnPanel.querySelectorAll("span")[1];
var crossTableBtn;
var crossTableElements;
var crossTableModal;
standingsBtn.addEventListener("click", standingsBtnClickHandler);
// need this for @media queries
var enginesAmount = 0;
var formatter = Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
});
var isSpaceKeyPressed = false;
// * typescript
var Pairs;
(function (Pairs) {
    Pairs["DoubleWin"] = "ccc-double-win";
    Pairs["Win"] = "ccc-win";
    Pairs["Draw"] = "ccc-draw";
    Pairs["Loss"] = "ccc-loss";
    Pairs["DoubleLoss"] = "ccc-double-loss";
})(Pairs || (Pairs = {}));
// * ---------------
// * extension logic
function convertCrossTable() {
    try {
        enginesAmount = 0;
        createOptionInputs();
        // @ts-ignore
        var activeCells = __spreadArray([], crossTableElements, true).filter(function (el) {
            if (el.classList.contains("crosstable-empty")) {
                enginesAmount++;
                return;
            }
            return el;
        });
        if (activeCells.length === 0) {
            // if we're here, then cross table
            // was opened before game data was received
            // and this function will handle live cross table update
            observeInitial();
        }
        activeCells.forEach(parseCell);
    }
    catch (e) {
        console.log(e.message);
    }
}
function observeInitial() {
    try {
        var initObserver_1 = new MutationObserver(function () {
            initObserver_1.disconnect();
            crossTableBtnClickHandler();
        });
        var modal = document.querySelector(".modal-vue-modal-container");
        if (modal) {
            initObserver_1.observe(modal, {
                childList: true,
                subtree: true,
            });
        }
    }
    catch (e) {
        console.log(e.message);
    }
}
function parseCell(cell) {
    // header with result --> 205 - 195 [+10]
    try {
        var cellHeader = cell.querySelector(".crosstable-head-to-head");
        if (!cellHeader)
            return;
        cellHeader.id = "ccc-cell-header";
        // result table for h2h vs one opponent
        var crossTableCell = cell.querySelector(".crosstable-result-wrapper");
        if (enginesAmount === 2) {
            crossTableCell.classList.add("one-v-one");
        }
        else if (enginesAmount > 8) {
            crossTableCell.classList.add("many");
        }
        crossTableCell.classList.add("ccc-cell-grid");
        // each div with game result in it
        var gameResultsDivs_1 = crossTableCell.querySelectorAll(".crosstable-result");
        var scoresArray_1 = [];
        var lastResult_1 = undefined;
        gameResultsDivs_1.forEach(function (result, index) {
            // ID needed to overwrite default CCC styles
            if (result) {
                result.id = "ccc-result";
            }
            if (index % 2 === 0) {
                result.classList.add("ccc-border-left");
                lastResult_1 = getResultFromNode(result);
                scoresArray_1.push(lastResult_1);
            }
            else {
                result.classList.add("ccc-border-right");
                var currentResult = getResultFromNode(result);
                var pairResult = getClassNameForPair(lastResult_1, currentResult);
                scoresArray_1.push(currentResult);
                result.classList.add(pairResult);
                gameResultsDivs_1[index - 1].classList.add(pairResult);
                result.classList.add(pairResult);
                gameResultsDivs_1[index - 1].classList.add(pairResult);
            }
        });
        // create and add ptnml stat
        var ptnmlWrapper = createStatWrapperElement();
        var _a = getStats(scoresArray_1), ptnml = _a[0], wdlArray = _a[1];
        var ptnmlElement = document.createElement("div");
        var ptnmlHeader = document.createElement("div");
        ptnmlHeader.id = "ptnml-header";
        ptnmlHeader.textContent = "Ptnml(0-2)";
        ptnmlElement.textContent = "".concat(ptnml[0], ", ").concat(ptnml[1], ", ").concat(ptnml[2], ", ").concat(ptnml[3], ", ").concat(ptnml[4]);
        ptnmlElement.classList.add("ccc-ptnml");
        ptnmlWrapper.append(ptnmlHeader, ptnmlElement);
        // create and add WDL stat
        var wdlWrapper = createStatWrapperElement();
        var wdlElement = createWDLELement(wdlArray);
        wdlWrapper.append(wdlElement);
        cellHeader.append(wdlWrapper, ptnmlWrapper);
        var observer_1 = new MutationObserver(function () {
            observer_1.disconnect();
            liveUpdate();
        });
        observer_1.observe(crossTableCell, {
            childList: true,
        });
    }
    catch (e) {
        console.log(e.message);
    }
}
// updates stats with each new game result
function liveUpdate() {
    try {
        // @ts-ignore
        var activeCells = __spreadArray([], crossTableElements, true).filter(function (el) {
            if (el.classList.contains("crosstable-empty")) {
                enginesAmount++;
                return;
            }
            return el;
        });
        if (activeCells.length === 0)
            return;
        // for each cell with games in it
        // find and remove all custom elements
        activeCells.forEach(function (cell) {
            var header = cell.querySelector("#ccc-cell-header");
            // wrappers for custom stats
            var wrappers = cell.querySelectorAll(".ccc-stat-wrapper");
            wrappers.forEach(function (wrapper) {
                header.removeChild(wrapper);
            });
        });
        // recalculate custom elements
        convertCrossTable();
    }
    catch (e) {
        console.log(e.message);
    }
}
// * -------------
// * utils
function getStats(arr) {
    try {
        var wdlArray_1 = [0, 0, 0]; // W D L in that order
        arr.forEach(function (score) {
            // score is either 1 0 -1
            // so by doing this we automatically
            // increment correct value
            wdlArray_1[1 - score] += 1;
        });
        // to get rid of an unfinished pair
        if (arr.length % 2 === 1)
            arr.pop();
        var ptnml = [0, 0, 0, 0, 0]; // ptnml(0-2)
        for (var i = 0; i < arr.length; i += 2) {
            var first = arr[i];
            var second = arr[i + 1];
            var res = first + second;
            if (res === 2) {
                ptnml[4] += 1;
            }
            else if (res === 1) {
                ptnml[3] += 1;
            }
            else if (res === 0) {
                ptnml[2] += 1;
            }
            else if (res === -1) {
                ptnml[1] += 1;
            }
            else {
                ptnml[0] += 1;
            }
        }
        return [ptnml, wdlArray_1];
    }
    catch (e) {
        console.log(e.message);
    }
}
function getResultFromNode(node) {
    if (node.classList.contains("win"))
        return 1;
    if (node.classList.contains("draw"))
        return 0;
    return -1;
}
function getClassNameForPair(lastResult, currentResult) {
    var pairScore = lastResult + currentResult;
    if (pairScore === 2)
        return Pairs.DoubleWin;
    if (pairScore === 1)
        return Pairs.Win;
    if (pairScore === 0)
        return Pairs.Draw;
    if (pairScore === -1)
        return Pairs.Loss;
    return Pairs.DoubleLoss;
}
function createStatWrapperElement() {
    var wrapper = document.createElement("div");
    wrapper.classList.add("ccc-stat-wrapper");
    return wrapper;
}
function createWDLELement(wdl) {
    var numberOfGames = wdl.reduce(function (amount, prev) { return amount + prev; }, 0);
    var wdlElement = document.createElement("div");
    wdlElement.classList.add("ccc-wdl-container");
    var w = document.createElement("p");
    var d = document.createElement("p");
    var l = document.createElement("p");
    w.textContent = "+".concat(wdl[0]);
    d.textContent = "=".concat(wdl[1]);
    l.textContent = "-".concat(wdl[2], " ");
    // default CCC styles
    w.classList.add("win");
    d.classList.add("draw");
    // custom style for more contrast
    l.classList.add("ccc-loss-font");
    l.classList.add("ccc-margin-right");
    var points = wdl[0] + wdl[1] / 2;
    var percent = formatter.format((points / numberOfGames) * 100);
    var winrateElement = document.createElement("p");
    winrateElement.classList.add("ccc-winrate-percentage");
    winrateElement.textContent = " ".concat(percent, "%");
    var elo;
    var margin;
    var eloWrapper;
    if (numberOfGames >= 2) {
        elo = calculateEloFromPercent(parseFloat(percent));
        margin = calculateErrorMargin(wdl[0], wdl[1], wdl[2]);
        eloWrapper = createEloAndMarginElement(elo, margin);
    }
    wdlElement.append(w, d, l);
    if (eloWrapper) {
        wdlElement.append(eloWrapper);
    }
    wdlElement.append(winrateElement);
    return wdlElement;
}
function createEloAndMarginElement(elo, margin) {
    var wrapper = document.createElement("div");
    var eloElement = document.createElement("p");
    var marginElement = document.createElement("p");
    wrapper.classList.add("ccc-elo-wrapper");
    eloElement.classList.add("ccc-elo");
    eloElement.classList.add(parseInt(elo) >= 0 ? "ccc-elo-positive" : "ccc-elo-negative");
    eloElement.textContent = "".concat(elo);
    marginElement.textContent = "".concat(margin);
    marginElement.classList.add("ccc-error-margin");
    wrapper.append(eloElement, marginElement);
    return wrapper;
}
// handles creation of customization inputs
function createOptionInputs() {
    var crossTableModal = document.querySelector(".modal-vue-modal-content");
    if (!crossTableModal) {
        return;
    }
    var width = crossTableModal.getBoundingClientRect().width;
    if (width < 220)
        return;
    var wrapper = document.createElement("div");
    wrapper.classList.add("ccc-options-wrapper");
    var formElement = document.createElement("form");
    var rowAmountInput = document.createElement("input");
    var ptnmlSwitchElement = document.createElement("input");
    var eloSwitchElement = document.createElement("input");
    rowAmountInput.classList.add("ccc-custom-option");
    rowAmountInput.classList.add("ccc-pairs-per-row-input");
    rowAmountInput.placeholder = "Pairs per row";
    rowAmountInput.type = "number";
    rowAmountInput.min = "0";
    formElement.append(rowAmountInput);
    wrapper.append(formElement);
    formElement.addEventListener("submit", function (e) {
        e.preventDefault();
        var value = rowAmountInput.valueAsNumber;
        crossTableModal.style.setProperty("--custom-column-amount", "".concat(value ? value * 2 : ""));
        // TODO
        // save this value to localStorage
    });
    crossTableModal.append(wrapper);
}
// * event handlers and listeners
var crossTableWithScroll = undefined;
window.addEventListener("keydown", keydownHandler);
window.addEventListener("keyup", function (e) {
    if (e.code !== "Space")
        return;
    crossTableWithScroll === null || crossTableWithScroll === void 0 ? void 0 : crossTableWithScroll.classList.remove("ccc-scroll-ready");
    window.removeEventListener("pointermove", pointerMoveHandler);
    isSpaceKeyPressed = false;
});
// close crosstable and tournament list on ESC
function keydownHandler(e) {
    if (e.code !== "Escape" && e.code !== "Space")
        return;
    if (e.code === "Escape") {
        handleCloseModalOnKeydown();
    }
    if (e.code === "Space") {
        // prevent scroll on Space
        e.preventDefault();
        if (!isSpaceKeyPressed) {
            crossTableWithScroll = document.getElementById("crosstable-crosstableModal");
            if (!crossTableWithScroll) {
                //
                return;
            }
            isSpaceKeyPressed = true;
            handleScrollByHold(e);
        }
    }
}
function handleScrollByHold(e) {
    var hasHorizontalScrollbar = crossTableWithScroll.scrollWidth > crossTableWithScroll.clientWidth;
    if (hasHorizontalScrollbar) {
        crossTableWithScroll.classList.add("ccc-scroll-ready");
    }
    else {
        crossTableWithScroll.classList.remove("ccc-scroll-ready");
        return;
    }
    window.addEventListener("pointerdown", function () {
        window.addEventListener("pointermove", pointerMoveHandler);
        crossTableWithScroll.classList.add("ccc-scrolling");
    });
    window.addEventListener("pointerup", function () {
        crossTableWithScroll.classList.remove("ccc-scrolling");
        window.removeEventListener("pointermove", pointerMoveHandler);
    });
}
function pointerMoveHandler(e) {
    crossTableWithScroll.scrollBy({
        left: -e.movementX,
        top: 0,
        behavior: "instant",
    });
}
function handleCloseModalOnKeydown() {
    var crossTableModal = document.querySelector(".modal-vue-modal-content");
    var tournamentsList = document.querySelector(".bottomtable-resultspopup");
    var engineDetailsPanel = document.querySelector(".enginedetails-panel");
    if (crossTableModal) {
        var closeBtn = crossTableModal.querySelector(".modal-close");
        closeBtn.click();
        return;
    }
    if (tournamentsList) {
        var closeDiv = document.querySelector(".bottomtable-event-name-wrapper");
        closeDiv.click();
        return;
    }
    if (engineDetailsPanel) {
        var closeBtn = document.querySelector("#enginedetails-close");
        console.log(closeBtn, "CLOSE BTN");
        console.log("INSIDE ENGINE DETAILS");
        closeBtn === null || closeBtn === void 0 ? void 0 : closeBtn.click();
    }
}
function standingsBtnClickHandler() {
    try {
        crossTableBtn = document
            .getElementById("standings-standings")
            .querySelector("button");
        crossTableBtn.addEventListener("click", crossTableBtnClickHandler);
    }
    catch (e) {
        console.log(e.message);
    }
}
function crossTableBtnClickHandler() {
    var crossTableModal = document.querySelector(".modal-vue-modal-content");
    crossTableElements = crossTableModal.querySelectorAll(".crosstable-results-cell");
    convertCrossTable();
}
// * elo calculation
// these formulas are taken from https://3dkingdoms.com/chess/elo.htm
// and I have no idea how they work
function calculateEloFromPercent(percent) {
    var percentage = percent / 100;
    var eloDiff = (-400 * Math.log(1 / percentage - 1)) / Math.LN10;
    var Sign = "";
    if (eloDiff > 0) {
        Sign = "+";
    }
    var eloDiffAsString = formatter.format(eloDiff);
    return "".concat(Sign).concat(eloDiffAsString);
}
function calculateEloDifference(percentage) {
    return (-400 * Math.log(1 / percentage - 1)) / Math.LN10;
}
function CalculateInverseErrorFunction(x) {
    var pi = Math.PI;
    var a = (8 * (pi - 3)) / (3 * pi * (4 - pi));
    var y = Math.log(1 - x * x);
    var z = 2 / (pi * a) + y / 2;
    var ret = Math.sqrt(Math.sqrt(z * z - y / a) - z);
    if (x < 0)
        return -ret;
    return ret;
}
function phiInv(p) {
    return Math.sqrt(2) * CalculateInverseErrorFunction(2 * p - 1);
}
function calculateErrorMargin(wins, draws, losses) {
    var total = wins + draws + losses;
    var winP = wins / total;
    var drawP = draws / total;
    var lossP = losses / total;
    var percentage = (wins + draws * 0.5) / total;
    var winsDev = winP * Math.pow(1 - percentage, 2);
    var drawsDev = drawP * Math.pow(0.5 - percentage, 2);
    var lossesDev = lossP * Math.pow(0 - percentage, 2);
    var stdDeviation = Math.sqrt(winsDev + drawsDev + lossesDev) / Math.sqrt(total);
    var confidenceP = 0.95;
    var minConfidenceP = (1 - confidenceP) / 2;
    var maxConfidenceP = 1 - minConfidenceP;
    var devMin = percentage + phiInv(minConfidenceP) * stdDeviation;
    var devMax = percentage + phiInv(maxConfidenceP) * stdDeviation;
    var difference = calculateEloDifference(devMax) - calculateEloDifference(devMin);
    var errorMargin = formatter.format(difference / 2);
    return "\u00B1".concat(errorMargin);
}
