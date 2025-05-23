// 保存当前右键点击的元素
let clickedElement = null;
let inspectMode = false;
let highlightedElement = null;
let highlightOverlay = null;

// 监听右键点击事件，保存当前元素
document.addEventListener(
  "contextmenu",
  function (event) {
    // clickedElement = event.target;
    clickedElement = document.elementFromPoint(event.clientX, event.clientY);
  },
  true
);

// 是否是唯一的选择器
function isUniqueSelector(selector) {
  const elements = document.querySelectorAll(selector);
  return elements.length === 1;
}

// 根据选择器获取元素
function getElementBySelector(selector) {
  return "document.querySelector(`" + selector + "`)";
}

// 生成唯一选择器的函数
function generateUniqueSelector(element) {
  if (
    !element ||
    element === document ||
    element === document.documentElement
  ) {
    return "";
  }

  // 优先检查ID
  if (element.id) {
    let idSelector = "#" + element.id;
    idSelector = idSelector.replaceAll(":", "\\:");
    // 如果选择器唯一而且不包含两个或更多数字
    if (!/\d.*\d/.test(idSelector) && isUniqueSelector(idSelector)) {
      return getElementBySelector(idSelector);
    }
  }

  // 用于判断是否为原子类的函数
  function isAtomicClass(className) {
    const atomicPatterns = [
      /^[whpmbft]-/, // 常见原子类前缀
      /^(flex|grid|gap|items|justify)-/,
      /(flex)/,
      /focus/i,
      /\d+/,
    ];
    return atomicPatterns.some((pattern) => pattern.test(className));
  }

  // 获取有效的属性选择器
  function getAttributeSelectors(element) {
    const validAttributes = Array.from(element.attributes)
      .filter((attr) => {
        const name = attr.name;
        // 排除一些不稳定或通用的属性
        const excludeNames = [
          "data-src",
          "data-action",
          "data-reg",
          "data-error",
          "data-regerror",
          "data-color",
          "data-loading",
        ];
        if (
          /\d/.test(name) ||
          /\d/.test(attr.value) ||
          attr.value.includes(" ") ||
          name.startsWith("data-v-") ||
          excludeNames.includes(name) ||
          attr.value.length >= 35 ||
          name.length >= 20
        ) {
          return false;
        }

        const includeNames = ["role", "aria-label", "name", "type", "href"];
        return name.startsWith("data-") || includeNames.includes(name);
      })
      .map((attr) => {
        if (attr.value) {
          return `[${attr.name}="${attr.value}"]`;
        } else {
          return `[${attr.name}]`;
        }
      })
      .sort((a, b) => a.length - b.length);
    return validAttributes;
  }

  // 获取非原子类的类名选择器
  function getClassSelectors(element) {
    if (!element.className || typeof element.className !== "string") return [];
    return element.className
      .trim()
      .split(/\s+/)
      .filter((cls) => cls && !isAtomicClass(cls) && cls.length <= 30)
      .map((cls) => `.${cls.replaceAll(":", "\\:")}`)
      .sort((a, b) => a.length - b.length);
  }

  // 生成选择器路径
  function generateSelectorPath(path) {
    const depth = 3;
    if (path.length <= depth) return path.join(" > ");

    let headSelector = path[0];
    let tailSelector = path[path.length - 1];
    let selectArr = [];
    for (let i = 1; i < path.length - 1; i++) {
      // 限制选择器路径的长度
      if (selectArr.length >= depth - 2) break;

      let curSelector = path[i];
      if (curSelector.includes(".") || curSelector.includes("data-")) {
        selectArr.push(curSelector);
      }
    }
    return [headSelector, ...selectArr, tailSelector].join(" ");
  }

  let path = [];
  let current = element;

  while (current && current !== document.documentElement) {
    const tagName = current.tagName.toLowerCase();
    const attributes = getAttributeSelectors(current);
    const classes = getClassSelectors(current);
    let id = current.id && current.id.length <= 20 ? `#${current.id}` : "";
    id = id.replaceAll(":", "\\:");

    let currentSelector = "";

    // 优先使用ID选择器
    if (id && !/\d.*\d/.test(id)) {
      currentSelector = tagName + id;
      if (isUniqueSelector(currentSelector)) {
        if (path.length === 0) {
          return getElementBySelector(currentSelector);
        }
        path.unshift(currentSelector);
        const fullSelector = generateSelectorPath(path);
        if (isUniqueSelector(fullSelector)) {
          return getElementBySelector(fullSelector);
        }
        path.shift(); // 如果不唯一，移除刚添加的选择器
      }
    }

    // 尝试单个属性选择器
    for (const attr of attributes) {
      currentSelector = tagName + attr;
      if (isUniqueSelector(currentSelector)) {
        if (path.length === 0) {
          return getElementBySelector(currentSelector);
        }
        path.unshift(currentSelector);
        const fullSelector = generateSelectorPath(path);
        if (isUniqueSelector(fullSelector)) {
          return getElementBySelector(fullSelector);
        }
        path.shift(); // 如果不唯一，移除刚添加的选择器
      }
    }

    // 尝试单个类名选择器
    for (const cls of classes) {
      currentSelector = tagName + cls;
      if (isUniqueSelector(currentSelector)) {
        if (path.length === 0) {
          return getElementBySelector(currentSelector);
        }
        path.unshift(currentSelector);
        const fullSelector = generateSelectorPath(path);
        if (isUniqueSelector(fullSelector)) {
          return getElementBySelector(fullSelector);
        }
        path.shift(); // 如果不唯一，移除刚添加的选择器
      }
    }

    // 尝试组合属性选择器
    if (attributes.length >= 2) {
      for (let i = 0; i < attributes.length - 1; i++) {
        for (let j = i + 1; j < attributes.length; j++) {
          currentSelector = tagName + attributes[i] + attributes[j];
          if (isUniqueSelector(currentSelector)) {
            if (path.length === 0) {
              return getElementBySelector(currentSelector);
            }
            path.unshift(currentSelector);
            const fullSelector = generateSelectorPath(path);
            if (isUniqueSelector(fullSelector)) {
              return getElementBySelector(fullSelector);
            }
            path.shift();
          }
        }
      }
    }

    // 尝试属性和类名组合
    if (attributes.length > 0 && classes.length > 0) {
      for (const attr of attributes) {
        for (const cls of classes) {
          currentSelector = tagName + attr + cls;
          if (isUniqueSelector(currentSelector)) {
            if (path.length === 0) {
              return getElementBySelector(currentSelector);
            }
            path.unshift(currentSelector);
            const fullSelector = generateSelectorPath(path);
            if (isUniqueSelector(fullSelector)) {
              return getElementBySelector(fullSelector);
            }
            path.shift();
          }
        }
      }
    }

    // 尝试组合类名选择器
    if (classes.length >= 2) {
      for (let i = 0; i < classes.length - 1; i++) {
        for (let j = i + 1; j < classes.length; j++) {
          currentSelector = tagName + classes[i] + classes[j];
          if (isUniqueSelector(currentSelector)) {
            if (path.length === 0) {
              return getElementBySelector(currentSelector);
            }
            path.unshift(currentSelector);
            const fullSelector = generateSelectorPath(path);
            if (isUniqueSelector(fullSelector)) {
              return getElementBySelector(fullSelector);
            }
            path.shift();
          }
        }
      }
    }

    // 获取最短的属性和类名
    const shortestAttr = attributes[0];
    const shortestClass = classes[0];
    // 如果所有尝试都失败，使用标签名+最短的属性名+类名的组合
    if (attributes.length > 0 && classes.length > 0) {
      currentSelector = tagName + shortestAttr + shortestClass;
    } else if (attributes.length > 0) {
      // 只有属性
      currentSelector = tagName + shortestAttr;
    } else if (classes.length > 0) {
      // 只有类名
      currentSelector = tagName + shortestClass;
    } else {
      // 没有属性和类名，使用标签名
      currentSelector = tagName;
    }

    path.unshift(currentSelector);

    current = current.parentElement;
  }

  // 如果没有找到唯一选择器，返回空字符串
  return "";
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
    z-index: 999999;
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
    z-index: 999999;
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
    } else {
      showNotification("无法生成唯一选择器");
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
    } else {
      showNotification("无法生成唯一选择器");

      // 通知背景脚本选择器生成失败
      chrome.runtime.sendMessage({
        action: "selectorGenerationFailed",
      });
    }
  } else if (request.action === "enableInspectMode") {
    enableInspectMode();
  }
});
