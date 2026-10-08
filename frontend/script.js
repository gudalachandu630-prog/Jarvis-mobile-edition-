console.log("JARVIS SCRIPT LOADED");

const sendBtn = document.getElementById("send");
const micBtn = document.getElementById("mic-btn");
const camBtn = document.getElementById("cam-btn");
const clearBtn = document.getElementById("clear-btn");
const msg = document.getElementById("msg");
const chat = document.getElementById("chat");

function test(message) {
    if (chat) {
        chat.innerHTML += `<p>${message}</p>`;
    }
    alert(message);
}

if (sendBtn) {
    sendBtn.addEventListener("click", function () {
        test("EXECUTE button is working!");
    });
}

if (micBtn) {
    micBtn.addEventListener("click", function () {
        test("MIC button is working!");
    });
}

if (camBtn) {
    camBtn.addEventListener("click", function () {
        test("CAMERA button is working!");
    });
}

if (clearBtn) {
    clearBtn.addEventListener("click", function () {
        test("CLEAR MEMORY button is working!");
    });
}

if (msg) {
    msg.addEventListener("keydown", function (event) {
        if (event.key === "Enter") {
            test("ENTER key is working!");
        }
    });
}
