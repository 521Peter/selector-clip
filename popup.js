document.addEventListener("DOMContentLoaded", () => {
  const inspectBtn = document.getElementById("inspectBtn");

  inspectBtn.addEventListener("click", () => {
    // 向当前活动标签发送消息，启用元素检查模式
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: "enableInspectMode" });
        window.close(); // 关闭弹出窗口
      }
    });
  });
});
