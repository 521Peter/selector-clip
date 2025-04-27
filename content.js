// 保存当前右键点击的元素
let clickedElement = null;
let inspectMode = false;
let highlightedElement = null;
let highlightOverlay = null;

// 监听右键点击事件，保存当前元素
document.addEventListener(
  "contextmenu",
  function (event) {
    clickedElement = event.target;
  },
  true
);

// 生成唯一选择器的函数
function generateUniqueSelector(element) {
  if (
    !element ||
    element === document ||
    element === document.documentElement
  ) {
    return "";
  }

  // 尝试使用ID
  if (element.id) {
    return "#" + element.id;
  }

  // 生成唯一路径
  let path = [];
  let current = element;

  while (current && current !== document.documentElement) {
    // 获取当前元素的标签名
    let selector = current.tagName.toLowerCase();

    // 添加类
    if (current.className && typeof current.className === "string") {
      const classes = current.className.trim().split(/\s+/);
      if (classes.length > 0 && classes[0] !== "") {
        selector += "." + classes.join(".");
      }
    }

    // 尝试添加nth-child
    if (current.parentNode) {
      const children = Array.from(current.parentNode.children);
      if (children.length > 1) {
        const index = children.indexOf(current) + 1;
        selector += `:nth-child(${index})`;
      }
    }

    // 将当前选择器添加到路径中
    path.unshift(selector);

    // 检查当前路径的唯一性
    const tempPath = path.join(" > ");
    const foundElements = document.querySelectorAll(tempPath);
    if (foundElements.length === 1) {
      return tempPath;
    }

    // 移动到父元素
    current = current.parentNode;
  }

  // 返回完整路径
  return path.join(" > ");
}

// 复制文本到剪贴板
function copyToClipboard(text) {
  // 创建临时文本区域
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed"; // 避免影响页面布局
  document.body.appendChild(textarea);
  textarea.select();

  // 尝试复制到剪贴板
  let success = false;
  try {
    success = document.execCommand("copy");
  } catch (err) {
    console.error("无法复制选择器: ", err);
  }

  // 移除临时元素
  document.body.removeChild(textarea);

  // 使用现代剪贴板API作为备选方案（适用于更现代的浏览器）
  if (!success && navigator.clipboard) {
    navigator.clipboard
      .writeText(text)
      .then(() => console.log("选择器已复制到剪贴板"))
      .catch((err) => console.error("无法复制选择器: ", err));
  }

  return success;
}

// 显示通知
function showNotification(message) {
  const notification = document.createElement("div");
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    background: #333;
    color: white;
    border-radius: 4px;
    z-index: 9999;
    font-family: Arial, sans-serif;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(notification);

  // 3秒后移除通知
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 3000);
}

// 创建高亮覆盖层
function createHighlightOverlay() {
  if (highlightOverlay) {
    document.body.removeChild(highlightOverlay);
  }

  highlightOverlay = document.createElement("div");
  highlightOverlay.style.cssText = `
    position: absolute;
    pointer-events: none;
    border: 2px solid #4285f4;
    background-color: rgba(66, 133, 244, 0.1);
    z-index: 9998;
    border-radius: 2px;
    box-shadow: 0 0 0 2000px rgba(0, 0, 0, 0.1);
  `;
  document.body.appendChild(highlightOverlay);
}

// 更新高亮元素
function highlightElement(element) {
  if (!highlightOverlay) {
    createHighlightOverlay();
  }

  if (!element) return;

  const rect = element.getBoundingClientRect();

  highlightOverlay.style.top = `${rect.top + window.scrollY}px`;
  highlightOverlay.style.left = `${rect.left + window.scrollX}px`;
  highlightOverlay.style.width = `${rect.width}px`;
  highlightOverlay.style.height = `${rect.height}px`;
  highlightOverlay.style.display = "block";

  highlightedElement = element;
}

// 移除高亮
function removeHighlight() {
  if (highlightOverlay) {
    highlightOverlay.style.display = "none";
  }
  highlightedElement = null;
}

// 启用检查模式
function enableInspectMode() {
  if (inspectMode) return;

  inspectMode = true;
  createHighlightOverlay();

  showNotification("检查模式已启用：点击元素复制其选择器");

  // 鼠标移动事件，高亮当前元素
  document.addEventListener("mousemove", onMouseMove);
  document.addEventListener("click", onInspectClick);

  // 添加CSS样式，改变鼠标指针
  const style = document.createElement("style");
  style.id = "selector-inspector-style";
  style.textContent = "body, body * { cursor: crosshair !important; }";
  document.head.appendChild(style);
}

// 禁用检查模式
function disableInspectMode() {
  if (!inspectMode) return;

  inspectMode = false;
  removeHighlight();

  document.removeEventListener("mousemove", onMouseMove);
  document.removeEventListener("click", onInspectClick);

  // 移除鼠标指针样式
  const style = document.getElementById("selector-inspector-style");
  if (style) {
    style.parentNode.removeChild(style);
  }
}

// 鼠标移动事件处理
function onMouseMove(event) {
  if (!inspectMode) return;

  const element = document.elementFromPoint(event.clientX, event.clientY);
  if (element !== highlightedElement) {
    highlightElement(element);
  }
}

// 检查模式下的点击事件
function onInspectClick(event) {
  if (!inspectMode) return;

  event.preventDefault();
  event.stopPropagation();

  if (highlightedElement) {
    const selector = generateUniqueSelector(highlightedElement);
    if (selector) {
      copyToClipboard(selector);
      showNotification("选择器已复制: " + selector);

      chrome.runtime.sendMessage({
        action: "selectorGenerated",
        selector: selector,
      });
    }
  }

  disableInspectMode();
  return false;
}

// 监听来自背景脚本的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelector" && clickedElement) {
    const selector = generateUniqueSelector(clickedElement);
    if (selector) {
      copyToClipboard(selector);
      showNotification("选择器已复制: " + selector);

      // 通知背景脚本
      chrome.runtime.sendMessage({
        action: "selectorGenerated",
        selector: selector,
      });
    }
  } else if (request.action === "enableInspectMode") {
    enableInspectMode();
  }
});
