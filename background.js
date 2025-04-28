// 创建右键菜单
chrome.runtime.onInstalled.addListener(() => {
  // 在页面任何位置的右键菜单
  chrome.contextMenus.create({
    id: "getSelector",
    title: "复制元素选择器",
    contexts: ["all"],
  });
});

// 处理右键菜单点击事件
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "getSelector" && tab.id) {
    // 向content脚本发送消息，获取选择器
    chrome.tabs.sendMessage(tab.id, { action: "getSelector" });
  }
});

// 监听来自content脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "selectorGenerated") {
    console.log("生成的选择器: ", request.selector);
  }
});
