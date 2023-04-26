function inject(fn, document) {
  const script = document.createElement('script');
  script.text = `(${fn.toString()})();`;
  document.documentElement.appendChild(script);
}

function getIframeWindow(iframe_object) {
  let doc;

  if (iframe_object.contentWindow) {
    return iframe_object.contentWindow;
  }

  if (iframe_object.window) {
    return iframe_object.window;
  }

  if (!doc && iframe_object.contentDocument) {
    doc = iframe_object.contentDocument;
  }

  if (!doc && iframe_object.document) {
    doc = iframe_object.document;
  }

  if (doc && doc.defaultView) {
    return doc.defaultView;
  }

  if (doc && doc.parentWindow) {
    return doc.parentWindow;
  }

  return undefined;
}

class ReadingMask {
  constructor() {
    this.unit = {
      heightPercentage: 25,
      widthPercentage: 100,
    };

    this.alpha = 0.45;
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.canvasState = {
      height,
      width,
      rectangleWidth: (this.unit.widthPercentage * width) / 100,
      rectangleHeight: (this.unit.heightPercentage * height) / 100,
    };

    this.lastMouseX = 0;
    this.lastMouseY = 0;

    this.isInitialized = false;

    this.addEventListeners = this.addEventListeners.bind(this);
    this.removeEventListeners = this.removeEventListeners.bind(this);
    this.getCanvas = this.getCanvas.bind(this);
    this.addCanvas = this.addCanvas.bind(this);
    this.removeCanvas = this.removeCanvas.bind(this);
    this.mouseMove = this.mouseMove.bind(this);
    this.onResize = this.onResize.bind(this);
    this.onScroll = this.onScroll.bind(this);
    this.drawRectangle = this.drawRectangle.bind(this);
    this.updateCanvasState = this.updateCanvasState.bind(this);
    this.setMutationObserver = this.setMutationObserver.bind(this);
    this.addListenerToIframe = this.addListenerToIframe.bind(this);
    this.setListenerToIframe = this.setListenerToIframe.bind(this);
    this.removeListenerToIframe = this.removeListenerToIframe.bind(this);
    this.iframeMouseMoveListener = this.iframeMouseMoveListener.bind(this);
    this.getIframes = this.getIframes.bind(this);
  }

  addEventListeners() {
    let canvas = this.getCanvas();
    this.canvasContext = canvas.getContext('2d');
    document.addEventListener('mousemove', this.mouseMove);
    window.addEventListener('resize', this.onResize);
    window.addEventListener('scroll', this.onScroll);
    this.setListenerToIframe();
    this.setMutationObserver();
  }

  setListenerToIframe() {
    let iframeList = this.getIframes();
    if (iframeList.length > 0) {
      for (let iframe of iframeList) {
        let iframeWindow = getIframeWindow(iframe);
        this.addListenerToIframe(iframeWindow, window);
      }
    }
  }

  removeListenerToIframe() {
    let iframeList = this.getIframes();
    if (iframeList.length > 0) {
      for (let iframe of iframeList) {
        let iframeWindow = getIframeWindow(iframe);
        this.removeEventListenerToIframe(iframeWindow, window);
      }
    }
  }

  getIframes() {
    let iframeList = document.getElementsByTagName('iframe');
    return iframeList;
  }

  setMutationObserver() {
    let main = this;
    this.mutationObserver = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function (node) {
            if (node.nodeName === 'IFRAME') {
              let iframeWindow = getIframeWindow(node);
              main.addListenerToIframe(iframeWindow, window);
            }
          });
        }
      });
    });
    this.mutationObserver.observe(document.body, { childList: true, subtree: true });
  }

  removeMutationObserver() {
    this.mutationObserver.disconnect();
  }

  removeEventListeners() {
    document.removeEventListener('mousemove', this.mouseMove);
    window.removeEventListener('resize', this.onResize);
    window.removeEventListener('scroll', this.onScroll);
    this.removeMutationObserver();
    this.removeListenerToIframe();
  }

  iframeMouseMoveListener(e) {
    let diffX = window.innerWidth - e.view.innerWidth;
    let diffY = window.innerHeight - e.view.innerHeight;
    this.drawRectangle(e.x + diffX, e.y + diffY);
  }

  addListenerToIframe(iframeWindow, window) {
    try {
      iframeWindow.addEventListener('mousemove', this.iframeMouseMoveListener);
    } catch (err) {
      console.log(err);
    }
  }

  removeEventListenerToIframe(iframeWindow, window) {
    try {
      iframeWindow.removeEventListener('mousemove', this.iframeMouseMoveListener);
    } catch (err) {
      console.log(err);
    }
  }

  getCanvas() {
    return document.getElementById('readingMaskCanvas');
  }

  addCanvas() {
    let canvas = document.createElement('canvas');
    canvas.setAttribute('width', this.canvasState.width);
    canvas.setAttribute('height', this.canvasState.height);
    canvas.setAttribute('id', 'readingMaskCanvas');
    canvas.style.zIndex = 10000;
    canvas.style.position = 'absolute';
    canvas.style.top = window.scrollY + 'px';
    canvas.style.left = window.scrollX + 'px';
    canvas.style.pointerEvents = 'none';
    document.body.appendChild(canvas);
    this.isInitialized = true;
  }

  removeCanvas() {
    let canvas = document.getElementById('readingMaskCanvas');
    if (canvas) {
      this.isInitialized = false;
      canvas.remove();
      this.removeEventListeners();
    }
  }

  drawRectangle(currentX, currentY) {
    const { rectangleWidth, rectangleHeight, width, height } = this.canvasState;
    let mouseX = currentX;
    let mouseY = currentY;
    this.lastMouseX = mouseX;
    this.lastMouseY = mouseY;
    if (this.canvasContext) {
      this.canvasContext.clearRect(0, 0, width, height);
      // alpha change place
      this.canvasContext.globalAlpha = this.alpha;
      this.canvasContext.globalCompositeOperation = 'xor';
      this.canvasContext.fillStyle = '#000';
      this.canvasContext.fillRect(0, 0, width, height);

      const centerX = rectangleWidth / 2;
      const centerY = rectangleHeight / 2;

      // For restricting borders we assign x and y min as 0 amd max as rectangle width and height
      const calculatedX = mouseX - centerX;
      const calculatedY = mouseY - centerY;

      let x = Math.max(calculatedX, 0);
      let y = Math.max(calculatedY, 0);

      const calculatedWidthX = x + rectangleWidth;
      const calculatedWidthY = y + rectangleHeight;

      const diffX = width - calculatedWidthX;
      const diffY = height - calculatedWidthY;

      if (diffX < 0) {
        x += diffX;
      }

      if (diffY < 0) {
        y += diffY;
      }

      this.canvasContext.clearRect(x, y, rectangleWidth, rectangleHeight);
    }
  }

  mouseMove(e) {
    this.drawRectangle(e.x, e.y);
  }

  onScroll(e) {
    requestAnimationFrame(() => {
      let canvas = this.getCanvas();
      canvas.style.top = window.scrollY + 'px';
      canvas.style.left = window.scrollX + 'px';
      this.drawRectangle(this.lastMouseX, this.lastMouseY);
    });
  }

  updateCanvasState() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (!this.lastMouseX || !this.lastMouseY) {
      // Setting Initial mouse position as center for initial draw
      this.lastMouseX = width / 2;
      this.lastMouseY = height / 2;
    }
    this.canvasState = {
      ...this.canvasState,
      height,
      width,
      rectangleWidth: (this.unit.widthPercentage * width) / 100,
      rectangleHeight: (this.unit.heightPercentage * height) / 100,
    };
    let canvas = this.getCanvas();
    canvas.setAttribute('width', this.canvasState.width);
    canvas.setAttribute('height', this.canvasState.height);
    canvas.style.top = window.scrollY + 'px';
    canvas.style.left = window.scrollX + 'px';
    this.drawRectangle(this.lastMouseX, this.lastMouseY);
  }

  onResize() {
    this.updateCanvasState();
  }

  initialize() {
    this.addCanvas();
    this.addEventListeners();
  }

  canvasOffsetChange(width, height, alpha) {
    this.alpha = alpha;
    this.unit = {
      ...this.unit,
      heightPercentage: height,
      widthPercentage: width,
    };
    this.updateCanvasState();
  }
}

const readingMask = new ReadingMask();
window.addEventListener('load', () => {
  let unit = {
    heightPercentage: 25,
    widthPercentage: 100,
  };
  let alpha = 0.45;
  let result = {
    maskState: false,
  };

  result = {
    height: unit.heightPercentage,
    width: unit.widthPercentage,
    alpha,
    maskState: 'true',
  };
});

// end of reading mask

/* 
    pointer.js was created by OwL for use on websites, 
     and can be found at https://seattleowl.com/pointer.
*/

$(document).ready(function () {
  let mouseX = -100;
  let mouseY = -100;
  let ringX = -100;
  let ringY = -100;
  let isHover = false;
  let mouseDown = false;
  let isRunning = true;
  const init_pointer = options => {
    isRunning = true;
    const pointer = document.createElement('div');
    pointer.id = 'pointer-dot';
    const ring = document.createElement('div');
    ring.id = 'pointer-ring';
    document.body.insertBefore(pointer, document.body.children[0]);
    document.body.insertBefore(ring, document.body.children[0]);
    document.onmousemove = mouse => {
      mouseX = mouse.clientX + window.pageXOffset;
      mouseY = mouse.clientY + window.pageYOffset;
    };

    window.onmousedown = mouse => {
      mouseDown = true;
    };

    window.onmouseup = mouse => {
      mouseDown = false;
    };

    const trace = (a, b, n) => {
      return (1 - n) * a + n * b;
    };
    window['trace'] = trace;

    const getOption = option => {
      let defaultObj = {
        pointerColor: '#750c7e',
        ringSize: 15,
        ringClickSize: (options['ringSize'] || 15) - 5,
      };
      if (options[option] == undefined) {
        return defaultObj[option];
      } else {
        return options[option];
      }
    };

    const render = () => {
      ringX = trace(ringX, mouseX, 0.2);
      ringY = trace(ringY, mouseY, 0.2);

      if (document.querySelector('.p-action-click:hover')) {
        pointer.style.borderColor = getOption('pointerColor');
        isHover = true;
      } else {
        pointer.style.borderColor = 'white';
        isHover = false;
      }
      ring.style.borderColor = getOption('pointerColor');
      if (mouseDown) {
        ring.style.padding = getOption('ringClickSize') + 'px';
      } else {
        ring.style.padding = getOption('ringSize') + 'px';
      }

      pointer.style.transform = `translate(${mouseX}px, ${mouseY}px)`;
      ring.style.transform = `translate(${
        ringX - (mouseDown ? getOption('ringClickSize') : getOption('ringSize'))
      }px, ${ringY - (mouseDown ? getOption('ringClickSize') : getOption('ringSize'))}px)`;

      if (isRunning) {
        requestAnimationFrame(render);
      }
    };
    if (isRunning) {
      requestAnimationFrame(render);
    }
  };

  const showModalEffect1 = (openButton, modalContent) => {
    const openBtn = document.getElementById(openButton),
      modalContainer = document.getElementById(modalContent);

    if (openBtn && modalContainer) {
      openBtn.addEventListener('click', event => {
        event.preventDefault();
        modalContainer.classList.add('show-accessibility');
      });
    }
  };
  showModalEffect1('open-accessibility', 'modal-container');

  /* ------------- CLOSE MODAL ------------- */

  const closeBtn = document.querySelectorAll('.close-modal');

  function closeModal(event) {
    event.preventDefault();
    const modalContainer = document.getElementById('modal-container');
    modalContainer.classList.remove('show-accessibility');
  }
  closeBtn.forEach(c => c.addEventListener('click', closeModal));

  // speech
  function getLanguage(text) {
    return new Promise((resolve, reject) => {
      let key = 'b6289798405742ffbfe8f9b8d57cec77';
      let endpoint = 'https://api.cognitive.microsofttranslator.com';
      let location = 'westeurope';
      let xhr = new XMLHttpRequest();
      let url = endpoint + '/detect?api-version=3.0';
      let data = [{ text: text }];

      xhr.onreadystatechange = function () {
        if (xhr.readyState === 4) {
          if (xhr.status === 200) {
            resolve(JSON.parse(xhr.responseText)[0].language);
          } else {
            reject(new Error(`Error ${xhr.status}: ${xhr.statusText}`));
          }
        }
      };

      xhr.open('POST', url, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Ocp-Apim-Subscription-Key', key);
      xhr.setRequestHeader('Ocp-Apim-Subscription-Region', location);
      xhr.send(JSON.stringify(data));
    });
  }

  function getVoices(code) {
    return new Promise((resolve, reject) => {
      function waitForVoices() {
        let voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
          if (!code.startsWith('en')) {
            voices = voices.filter(voice => voice.lang.startsWith(code));
          } else {
            let eng_voices = voices.filter(
              voice =>
                voice.name == 'Daniel' ||
                (voice.name.startsWith('Eddy') && voice.lang.startsWith(code))
            );
            voices = eng_voices.length
              ? eng_voices
              : voices.filter(voice => voice.lang.startsWith(code));
          }
          resolve(voices);
        } else {
          setTimeout(waitForVoices, 50);
        }
      }
      waitForVoices();
    });
  }

  let speechSpeed = 1;
  let bg = '';
  // async function speak(text, rate, pitch, volume, target) {
  //   let result = await getLanguage(text);
  //   // create a SpeechSynthesisUtterance to configure the how text to be spoken
  //   let speakData = new SpeechSynthesisUtterance();
  //   speakData.volume = volume; // From 0 to 1
  //   speakData.rate = speechSpeed; // From 0.1 to 10
  //   speakData.pitch = pitch; // From 0 to 2
  //   speakData.text = text;
  //   speakData.lang = result;
  //   let voices = await getVoices(result);
  //   speakData.voice = voices[0];
  //   // pass the SpeechSynthesisUtterance to speechSynthesis.speak to start speaking
  //   await new Promise((resolve, reject) => {
  //     speakData.onend = () => {
  //       resolve();
  //       target.style.removeProperty('background-color');
  //       if (bg) {
  //         if (target.style.boxShadow) {
  //           target.style.backgroundColor = bg;
  //         }
  //       }
  //     };
  //     speakData.onerror = error => {
  //       reject(error);
  //     };
  //     speechSynthesis.speak(speakData);
  //   });
  // }

  async function speak(text, rate, pitch, volume, target) {
    speechSynthesis.cancel();
    // let result = await getLanguage(text);
    let result = $('body').attr('data-lang');
    let speakData = new SpeechSynthesisUtterance();
    speakData.volume = volume;
    speakData.rate = rate;
    speakData.pitch = pitch;
    speakData.text = text;
    speakData.lang = result;
    let voices = await getVoices(result);
    speakData.voice = voices[0];

    if ($('.feature-tab-enable').length) {
      // Add event listener to stop speaking when element loses focus
      target.addEventListener('blur', () => {
        speechSynthesis.cancel();
        target.style.removeProperty('background-color');
      });
      // Check if target element has focus before speaking
      if (document.activeElement === target) {
        await new Promise((resolve, reject) => {
          speakData.onend = () => {
            resolve();
            target.style.removeProperty('background-color');
            if (bg) {
              if (target.style.boxShadow) {
                target.style.backgroundColor = bg;
              }
            }
          };
          speakData.onerror = error => {
            reject(error);
          };
          speechSynthesis.speak(speakData);
        });
      }
    } else {
      await new Promise((resolve, reject) => {
        speakData.onend = () => {
          resolve();
          target.style.removeProperty('background-color');
          if (bg) {
            if (target.style.boxShadow) {
              target.style.backgroundColor = bg;
            }
          }
        };
        speakData.onerror = error => {
          reject(error);
        };
        speechSynthesis.speak(speakData);
      });
    }
  }
  var speech = function speech(event) {
    if (
      $(event.target).css('background-color') == 'rgb(255, 255, 0)' ||
      $(event.target).css('background-color') == 'yellow' ||
      $(event.target).css('background') == 'rgb(255, 255, 0)' ||
      $(event.target).css('background') == 'yellow' ||
      $(event.target)[0].localName == 'textarea'
    ) {
      return;
    }
    if (event.target.style.backgroundColor) {
      bg = event.target.style.backgroundColor;
    }

    let prevSelected =
      document.querySelector('[style*="background"]') ||
      document.querySelector('[style*="background-color"]');
    $(prevSelected).css({
      background: '',
    });
    event.target.style.backgroundColor = 'yellow';

    let rate = speechSpeed,
      pitch = 1,
      volume = 1;
    let msg = new SpeechSynthesisUtterance();

    speak(event.target.innerText, rate, pitch, volume, event.target);
  };
  function speechDisable() {
    if ('speechSynthesis' in window) {
      let tags = document.querySelectorAll('p,a,h1,h2,h3, td, label, b, span'); // add more tags for you project
      tags.forEach(tag => {
        tag.removeEventListener('click', speech);
      });
    }
  }
  function speechEnable() {
    if ('speechSynthesis' in window) {
      let tags = document.querySelectorAll('p,a,h1,h2,h3, td, label, b, span, textarea'); // add more tags for you project
      tags.forEach(tag => {
        tag.addEventListener('click', speech);
      });
    } else {
      console.log(' Speech Synthesis Not Supported 😞');
    }
  }
  // add tabindex
  function addTabIndex() {
    let questionArea = document.querySelector('#question-area');
    let tabIdx = 1;
    let childElements = questionArea.querySelectorAll(
      'p, label, td, b, span.questText, .questDiv, span.radioAnswers, input, button, span, textarea, a'
    );

    start_button;
    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      if (elem.localName == 'input' || elem.localName == 'button' || elem.localName == 'textarea') {
        hasText = true;
      }
      for (let i = 0; i < children.length; i++) {
        if (elem.classList.contains('radioAnswers')) {
          if (children[i].childNodes[0].nodeType !== 1) {
            hasText = true;
          }
          break;
        }
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        elem.setAttribute('tabindex', tabIdx);
        tabIdx++;
      }
    });
  }

  function removeTabIndex() {
    $('[tabindex]').removeAttr('tabindex');
  }

  function speechTab(evt) {
    $(evt.target).click();
  }
  function highlightElement(evt) {
    let prevSelected = document.querySelector('[style*="box-shadow"]');
    if (prevSelected && prevSelected !== evt.target) {
      if (prevSelected.style.backgroundColor != 'yellow') {
        $(prevSelected).css({
          outline: '',
          background: '',
          color: '',
          '-webkit-box-shadow': '',
          'box-shadow': '',
          'text-shadow': '',
        });
      } else {
        $(prevSelected).css({
          outline: '',
          color: '',
          '-webkit-box-shadow': '',
          'box-shadow': '',
          'text-shadow': '',
        });
      }
    }
    let oldStyle = $(evt.target).attr('style') ? $(evt.target).attr('style') : '';

    var attr = $(evt.target).attr('tabindex');
    if (typeof attr !== 'undefined' && attr !== false) {
      if ($('.feature-speech-enable').length && $(evt.target).hasClass('SpepeateRadio')) {
      } else {
        $(evt.target).attr(
          'style',
          'outline: 0 !important;background: #3395FF !important;color: #000 !important;-webkit-box-shadow: none !important;box-shadow: 0 0 0 2px #3395FF !important;text-shadow: none!important;' +
            oldStyle
        );
      }
    }
    if ($('.feature-speech-enable').length && !$(evt.target).hasClass('SpepeateRadio')) {
      $(evt.target).attr(
        'style',
        'outline: 0 !important;background: #3395FF !important;color: #000 !important;-webkit-box-shadow: none !important;box-shadow: 0 0 0 2px #3395FF !important;text-shadow: none!important;' +
          oldStyle
      );
      $(evt.target).click();
    }
  }

  // add tabindex
  function fontSizeIncrease(fontSizeCount) {
    fontSizeDecrease();
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        var sizeinem = parseFloat($(elem).css('font-size'));
        $(elem).css('font-size', sizeinem + 4 * fontSizeCount);
      }
    });
  }

  // add tabindex
  function fontSizeDecrease() {
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        $(elem).css('font-size', '');
      }
    });
  }

  // spacing

  function spaceIncrease(spacing) {
    spaceDecrease();
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        var wordsp = parseFloat($(elem).css('word-spacing'));
        $(elem).css('word-spacing', wordsp + 3 * spacing);
        var lettersp = parseFloat($(elem).css('letter-spacing'));
        $(elem).css('letter-spacing', lettersp + 1 * spacing);
      }
    });
  }

  function spaceDecrease() {
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        $(elem).css('word-spacing', '');
        $(elem).css('letter-spacing', '');
      }
    });
  }

  // line height

  function lineIncrease(lineHeight) {
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        var lineH = $(elem).css('line-height');
        if (lineH == 'normal' && lineHeight == 1) {
          lineH = 1.2;
          $(elem).css('line-height', lineH + 1);
        } else if (lineH == 'normal' && lineHeight == 2) {
          lineH = 1.2;
          $(elem).css('line-height', lineH + 1.8);
        } else {
          $(elem).css('line-height', `${parseFloat(lineH) + 10}px`);
        }
      }
    });
  }

  function lineDecrease() {
    let questionArea = document.querySelector('#question-area');
    let childElements = questionArea.querySelectorAll('*:not(span.badge):not(strong)');

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (children[i].nodeType === 3 && children[i].textContent.trim().length > 0) {
          hasText = true;
          break;
        }
      }
      if (hasText) {
        $(elem).css('line-height', '');
      }
    });
  }

  // hide images

  function hideImg() {
    // Hide all images and background images
    var imageURLs = $('body, .container div, .container form, .screen_top, .screen_top *');
    imageURLs.each(function (index, element) {
      if (element.closest('#open-accessibility-wrap') || element.closest('#voice_commands')) {
        return;
      }
      $(element).attr('style', 'background: 0 0 !important;');
    });
    var images = document.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
      images[i].style.display = 'none';
    }
  }

  function showImg() {
    // Show all images and background images
    var images = document.getElementsByTagName('img');
    for (var i = 0; i < images.length; i++) {
      images[i].style.display = '';
    }

    var imageURLs = $('body, .container div,.container form, .screen_top, .screen_top *');
    imageURLs.each(function (index, element) {
      $(element).css('background', '');
    });
  }

  // show tooltip
  var tooltipEnabled = false;

  $('input[type="submit"], button, a')
    .hover(
      function () {
        if (tooltipEnabled) {
          var tooltipText = $(this).val() || $(this).text();
          $(this).data('tooltip', tooltipText);
          $('<p class="tooltip"></p>').text(tooltipText).appendTo('body').fadeIn('slow');
        }
      },
      function () {
        $(this).data('tooltip', '').removeAttr('title');
        $('.tooltip').remove();
      }
    )
    .mousemove(function (e) {
      if (tooltipEnabled) {
        var mousex = e.pageX + 20;
        var mousey = e.pageY + 10;
        $('.tooltip').css({ top: mousey, left: mousex });
      }
    });

  // speech for textareas

  var questDiv,
    final_span,
    interim_span,
    start_button,
    start_img,
    info,
    info_start,
    info_allow,
    info_speak_now,
    info_no_speech,
    info_upgrade,
    info_blocked,
    info_denied,
    info_no_microphone;
  // showInfo('info_start');
  var final_transcript = '';
  var recognizing = false;
  var ignore_onend;
  var start_timestamp;
  function upgrade() {
    $('.info_start').css('display', 'none');
    $('.info_upgrade').css('display', 'inline');
    $('button.start_button').css('display', 'none');
  }
  var two_line = /\n\n/g;
  var one_line = /\n/g;
  function linebreak(s) {
    return s.replace(two_line, '<p></p>').replace(one_line, '<br>');
  }
  var first_char = /\S/;
  function capitalize(s) {
    return s.replace(first_char, function (m) {
      return m.toUpperCase();
    });
  }
  function showInfo(s) {
    if (s) {
      for (var child = info.firstChild; child; child = child.nextSibling) {
        if (child.style) {
          child.style.display = child == s ? 'inline' : 'none';
        }
      }
      info.style.visibility = 'visible';
    } else {
      info.style.visibility = 'hidden';
    }
  }
  if (!('webkitSpeechRecognition' in window)) {
    // upgrade();
    // return;
    var recognition;
  } else {
    var recognition = new webkitSpeechRecognition();
  }

  function speechStartBtn(event) {
    start_button = $(event.target)[0];
    questDiv = $(event.target).closest('.questDiv');
    final_span = questDiv.find('.final_span')[0];
    interim_span = questDiv.find('.interim_span')[0];
    start_img = questDiv.find('.start_img')[0];
    info = questDiv.find('.info-speech')[0];
    info_allow = questDiv.find('.info_allow')[0];
    info_start = questDiv.find('.info_start')[0];
    info_blocked = questDiv.find('.info_blocked')[0];
    info_denied = questDiv.find('.info_denied')[0];
    info_speak_now = questDiv.find('.info_speak_now')[0];
    info_no_speech = questDiv.find('.info_no_speech')[0];
    info_no_microphone = questDiv.find('.info_no_microphone')[0];

    var textarea = questDiv.find('textarea')[0];
    let textareaText = $($(textarea)[0]).val();

    if (recognizing) {
      recognition.stop();
      start_img.src =
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E';
      showInfo(info_no_microphone);
      return;
    }

    if (!('webkitSpeechRecognition' in window)) {
      upgrade();
    } else {
      start_button.style.display = 'inline-block';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onstart = function () {
        recognizing = true;
        showInfo(info_speak_now);
        start_img.src =
          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M9%2013c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0-6c1.1%200%202%20.9%202%202s-.9%202-2%202-2-.9-2-2%20.9-2%202-2zm0%208c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4zm-6%204c.22-.72%203.31-2%206-2%202.7%200%205.8%201.29%206%202H3zM15.08%207.05c.84%201.18.84%202.71%200%203.89l1.68%201.69c2.02-2.02%202.02-5.07%200-7.27l-1.68%201.69zM20.07%202l-1.63%201.63c2.77%203.02%202.77%207.56%200%2010.74L20.07%2016c3.9-3.89%203.91-9.95%200-14z%22%2F%3E%3C%2Fsvg%3E';
      };
      recognition.onerror = function (event) {
        if (event.error == 'no-speech') {
          start_img.src =
            'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%206v3l4-4-4-4v3c-4.42%200-8%203.58-8%208%200%201.57.46%203.03%201.24%204.26L6.7%2014.8c-.45-.83-.7-1.79-.7-2.8%200-3.31%202.69-6%206-6zm6.76%201.74L17.3%209.2c.44.84.7%201.79.7%202.8%200%203.31-2.69%206-6%206v-3l-4%204%204%204v-3c4.42%200%208-3.58%208-8%200-1.57-.46-3.03-1.24-4.26z%22%2F%3E%3C%2Fsvg%3E';
          showInfo(info_no_speech);
          ignore_onend = true;
        }
        if (event.error == 'audio-capture') {
          start_img.src =
            'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E';
          showInfo(info_no_microphone);
          ignore_onend = true;
        }
        if (event.error == 'not-allowed') {
          if (event.timeStamp - start_timestamp < 100) {
            showInfo(info_blocked);
          } else {
            showInfo(info_denied);
          }
          ignore_onend = true;
        }
      };
      recognition.onend = function () {
        recognizing = false;
        if (ignore_onend) {
          return;
        }
        start_img.src =
          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E';
        if (!final_transcript) {
          showInfo(info_start);
          return;
        }

        showInfo(info_start);
        if (window.getSelection) {
          window.getSelection().removeAllRanges();
          var range = document.createRange();
          range.selectNode(final_span);
          window.getSelection().addRange(range);
        }
      };
      recognition.onresult = function (event) {
        var interim_transcript = '';
        for (var i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final_transcript += event.results[i][0].transcript;
            $($(textarea)[0]).val(textareaText + ' ' + final_transcript);
          } else {
            interim_transcript += event.results[i][0].transcript;
            $($(textarea)[0]).val(textareaText + ' ' + final_transcript + interim_transcript);
          }
        }
        final_transcript = capitalize(final_transcript);
        final_span.innerHTML = linebreak(final_transcript);
        interim_span.innerHTML = linebreak(interim_transcript);
      };
    }
    final_transcript = '';
    recognition.lang = $('body').attr('data-lang');
    recognition.start();
    ignore_onend = false;
    final_span.innerHTML = '';
    interim_span.innerHTML = '';
    start_img.src =
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M10.8%204.9c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%203.91L15%2010.6V5c0-1.66-1.34-3-3-3-1.54%200-2.79%201.16-2.96%202.65l1.76%201.76V4.9zM19%2011h-1.7c0%20.58-.1%201.13-.27%201.64l1.27%201.27c.44-.88.7-1.87.7-2.91zM4.41%202.86L3%204.27l6%206V11c0%201.66%201.34%203%203%203%20.23%200%20.44-.03.65-.08l1.66%201.66c-.71.33-1.5.52-2.31.52-2.76%200-5.3-2.1-5.3-5.1H5c0%203.41%202.72%206.23%206%206.72V21h2v-3.28c.91-.13%201.77-.45%202.55-.9l4.2%204.2%201.41-1.41L4.41%202.86z%22%2F%3E%3C%2Fsvg%3E';
    showInfo(info_allow);
    start_timestamp = event.timeStamp;
  }
  // voice commands

  var groups = [];

  function selectGroups() {
    const questTextElements = $('.questText, .control-label');
    let i = 0;
    questTextElements.each(function () {
      i++;
      const questTextElement = $(this);
      $(questTextElement).append(`<span class="number-command">${i}</span>`);
      const closestElement = questTextElement.nextAll('.radioAnswersDiv, .questDiv, table').first();
      if (closestElement.length) {
        const inBetweenElements = questTextElement.nextUntil(closestElement);
        let group = [questTextElement.get(0), closestElement.get(0)];
        if (inBetweenElements.length) {
          group = group.concat(inBetweenElements.get());
        }
        groups.push(group);
      }
    });
  }

  function unselectGroups() {
    $('.number-command').remove();
    groups = [];
  }

  let selectedEl;

  var typing = false;
  var textarea = null;

  var final_transcript = '';
  var recognizing = false;
  var ignore_onend;
  var start_timestamp;
  var recognitionVC;

  function speechVoiceCom(event) {
    let imgVC = $('#start_button_vc img');
    if (recognitionVC) {
      recognitionVC.stop();
      imgVC.attr(
        'src',
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E'
      );
      $('#info').html('Click on the microphone icon and begin speaking');
      recognitionVC = false;
      return;
    }

    recognitionVC = new webkitSpeechRecognition();
    recognitionVC.continuous = true;
    recognitionVC.interimResults = true;
    recognitionVC.lang = 'en-US';
    recognitionVC.start();
    recognitionVC.onstart = function () {
      console.log(1);
      recognizing = true;
      $('#info').html('listening...');
      $(imgVC).attr(
        'src',
        'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M9%2013c2.21%200%204-1.79%204-4s-1.79-4-4-4-4%201.79-4%204%201.79%204%204%204zm0-6c1.1%200%202%20.9%202%202s-.9%202-2%202-2-.9-2-2%20.9-2%202-2zm0%208c-2.67%200-8%201.34-8%204v2h16v-2c0-2.66-5.33-4-8-4zm-6%204c.22-.72%203.31-2%206-2%202.7%200%205.8%201.29%206%202H3zM15.08%207.05c.84%201.18.84%202.71%200%203.89l1.68%201.69c2.02-2.02%202.02-5.07%200-7.27l-1.68%201.69zM20.07%202l-1.63%201.63c2.77%203.02%202.77%207.56%200%2010.74L20.07%2016c3.9-3.89%203.91-9.95%200-14z%22%2F%3E%3C%2Fsvg%3E'
      );
    };
    recognitionVC.onresult = function (event) {
      var interim_transcript = '';
      for (var i = event.resultIndex; i < event.results.length; ++i) {
        textareaText = $($(textarea)[0]).val();
        $('#info').html(' ');
        if (event.results[i].isFinal) {
          final_transcript = event.results[i][0].transcript;
          if (
            typing &&
            textarea &&
            final_transcript.toLowerCase().trim() != 'exit' &&
            final_transcript.toLowerCase().trim().indexOf('delete') < 0
          ) {
            $($(textarea)[0]).val(textareaText.trim() + ' ' + final_transcript.trim());
          } else if (
            typing &&
            textarea &&
            final_transcript.toLowerCase().trim().indexOf('delete') >= 0
          ) {
            deleteWords(final_transcript.toLowerCase().trim());
          } else {
            final_spanVC.innerHTML = final_transcript;
            handleVoiceCommand(final_transcript + interim_transcript);
          }
        } else {
          if (!typing && !textarea) {
            interim_transcript += event.results[i][0].transcript;
            $('#info').html('listening...');
          }
          if (!typing && !textarea) {
            final_spanVC.innerHTML = final_transcript;
            interim_spanVC.innerHTML = interim_transcript;
            // $('#info').html('listening...')
          }
        }
      }
      if (!typing && !textarea) {
        final_spanVC.innerHTML = final_transcript;
        interim_spanVC.innerHTML = interim_transcript;
        // $('#info').html('listening...')
      }
    };
    recognitionVC.onerror = function (event) {
      if (event.error == 'no-speech') {
        $(imgVC).attr(
          'src',
          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%206v3l4-4-4-4v3c-4.42%200-8%203.58-8%208%200%201.57.46%203.03%201.24%204.26L6.7%2014.8c-.45-.83-.7-1.79-.7-2.8%200-3.31%202.69-6%206-6zm6.76%201.74L17.3%209.2c.44.84.7%201.79.7%202.8%200%203.31-2.69%206-6%206v-3l-4%204%204%204v-3c4.42%200%208-3.58%208-8%200-1.57-.46-3.03-1.24-4.26z%22%2F%3E%3C%2Fsvg%3E'
        );
        $('#info').html('No speech was detected.');
        ignore_onend = true;
      }
      if (event.error == 'audio-capture') {
        $(imgVC).attr(
          'src',
          'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E'
        );
        $('#info').html('No microphone was found.');
        ignore_onend = true;
      }
      if (event.error == 'not-allowed') {
        if (event.timeStamp - start_timestamp < 100) {
          $('#info').html('Permission to use microphone is blocked.');
        } else {
          $('#info').html('Permission to use microphone was denied.');
        }
        ignore_onend = true;
      }
    };
  }

  function handleVoiceCommand(command) {
    let com = command
      .toLowerCase()
      .trim()
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, '');
    if (com.indexOf('select') >= 0) {
      if (com.indexOf('question') >= 0) {
        selectQGroup(com);
        return;
      } else if (com.indexOf('next answer') >= 0) {
        selectNextAnswer();
        return;
      } else if (com.indexOf('previous answer') >= 0) {
        selectPreviousAnswer();
        return;
      } else if (com.indexOf('answer') >= 0) {
        selectAnswer(com);
        return;
      }
    } else if (com.startsWith('remove answer')) {
      unselectAnswer(com);
      return;
    } else if (com.startsWith('type')) {
      typeInTextarea(com);
      return;
    } else if (com.startsWith('exit')) {
      exitTyping();
      return;
    } else if (com.startsWith('delete')) {
      deleteWords(com);
      return;
    }
    switch (command.toLowerCase().trim()) {
      case 'pause':
        $('#start_button_vc').click();
        break;
      case 'next question':
        nextElement();
        break;
      case 'previous question':
        previousElement();
        break;
      case 'scroll up':
        scrollUp();
        break;
      case 'scroll down':
        scrollDown();
        break;
      case 'continue':
        if ($('#continue').length) {
          continueClick();
        }
        break;
      case 'go back':
        if ($('#goBack').length) {
          goBack();
        }
        break;
      case 'finish survey':
        if ($('#finishCrit').length) {
          finishCrit();
        }
        break;
      case 'stop':
        stopVNav();
        break;
      default:
        $('#info').html('command not found, pls try again');
      // Add other voice commands as needed
    }
  }

  function nextElement() {
    let prevSelected = $('[style*="box-shadow"]');
    if (prevSelected) {
      for (var i = 0; i < prevSelected.length; i++) {
        $(prevSelected[i]).css('box-shadow', '');
      }
    }
    numb++;
    if (!numb || numb > groups.length) {
      $('#info').html('Question not found');
      return;
    }
    selectedEl = groups[numb - 1];
    scrollToElem();
    for (var i = 0; i < selectedEl.length; i++) {
      $(selectedEl[i]).css('box-shadow', '0 0 10px blue');
    }
    $('#info').html('Question selected');
  }

  function previousElement() {
    let prevSelected = $('[style*="box-shadow"]');
    if (prevSelected) {
      for (var i = 0; i < prevSelected.length; i++) {
        $(prevSelected[i]).css('box-shadow', '');
      }
    }
    numb--;

    if (!numb || numb > groups.length) {
      $('#info').html('Question not found');
      return;
    }
    selectedEl = groups[numb - 1];
    scrollToElem();
    for (var i = 0; i < selectedEl.length; i++) {
      $(selectedEl[i]).css('box-shadow', '0 0 10px blue');
    }

    $('#info').html('Question selected');
  }

  function scrollToElem() {
    $([document.documentElement, document.body]).animate(
      {
        scrollTop: $(selectedEl[0]).offset().top - 100,
      },
      2000
    );
  }
  function scrollUp() {
    window.scrollBy(0, -500);
  }

  function scrollDown() {
    window.scrollBy(0, 500);
  }

  function continueClick() {
    $('#continue').click();
  }

  function goBack() {
    $('#goBack').click();
  }

  function finishCrit() {
    $('#finishCrit').click();
  }

  function stopVNav() {
    $('html').removeClass('feature-voice-commands');
    let prevSelected = $('[style*="box-shadow"]');
    if (prevSelected) {
      for (var i = 0; i < prevSelected.length; i++) {
        $(prevSelected[i]).css('box-shadow', '');
      }
    }
    unselectGroups();

    let imgVC = $('#start_button_vc img');
    imgVC.attr(
      'src',
      'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E'
    );
    $('#info').html('Click on the microphone icon and begin speaking');
    if (recognitionVC) {
      recognitionVC.stop();
    }
    final_spanVC.innerHTML = '';
    interim_spanVC.innerHTML = '';
    $('#info').html('');
  }

  let numb = 1;

  function textNum(command) {
    let num = false;
    var regex = /\d+$/;
    var matches = command.match(regex);
    if (matches != null) {
      num = parseInt(matches[0]);
    } else {
      num = command.split(' ');
      num = text2num(num[num.length - 1]);
      if (!num) {
        console.log('number not found');
        return false;
      }
    }
    return num;
  }

  function selectQGroup(command) {
    numb = textNum(command);
    if (!numb || numb > groups.length) {
      $('#info').html('Question not found');
      return;
    }
    let prevSelected = $('[style*="box-shadow"]');
    if (prevSelected) {
      for (var i = 0; i < prevSelected.length; i++) {
        $(prevSelected[i]).css('box-shadow', '');
      }
    }

    selectedEl = groups[numb - 1];

    scrollToElem();
    for (var i = 0; i < selectedEl.length; i++) {
      $(selectedEl[i]).css('box-shadow', '0 0 10px blue');
    }
    $('#info').html('Question selected');
  }
  let numQ = 0;
  function selectAnswer(command) {
    numQ = textNum(command);
    let elements = $(selectedEl).find('input[type="radio"], input[type="checkbox"]');
    if (!selectedEl) {
      $('#info').html('pls select question');
      return;
    }
    if (!numQ || numQ > elements.length) {
      $('#info').html('answer not found');
      return;
    }
    if ($(elements[numQ - 1]).is(':checked')) {
      $('#info').html('answer already selected');
    } else {
      $(elements[numQ - 1]).click();
      $('#info').html('answer selected');
    }
  }

  function selectNextAnswer() {
    numQ++;
    selectAnswer(`select answer ${numQ}`);
  }
  function selectPreviousAnswer() {
    numQ--;
    selectAnswer(`select answer ${numQ}`);
  }

  function unselectAnswer(command) {
    let numQ = textNum(command);
    let elements = $(selectedEl).find('input[type="radio"], input[type="checkbox"]');
    if (!numQ || numQ > elements.length) {
      $('#info').html('answer not found');
      return;
    }
    if (!$(elements[numQ - 1]).hasClass('checkboxAnswers')) {
      $('#info').html('select another answer for unselecting this one');
      return;
    }
    if (!$(elements[numQ - 1]).is(':checked')) {
      $('#info').html('answer already not selected');
    } else {
      $(elements[numQ - 1]).click();
      $('#info').html('answer unselected');
    }
  }

  function typeInTextarea(command) {
    if (!typing) {
      textarea = findTextarea();
      if (textarea) {
        typing = true;
        textarea.focus();
      } else {
        $('#info').html('Textarea not found');
      }
    } else {
      var input = command.substring(4);
      textarea.value += input;
    }
  }

  let textareaF;
  function findTextarea() {
    selectedEl = groups[numb - 1];
    textareaF = $(selectedEl).find('textarea.textareaQuest');
    return textareaF[0];
  }

  function exitTyping() {
    typing = false;
    if (textareaF) {
      textareaF.blur();
    }
    textareaF = null;
    final_spanVC.innerHTML = '';
    interim_spanVC.innerHTML = '';
  }

  function deleteWords(command) {
    if (command.indexOf('delete all') >= 0) {
      if (textareaF) {
        textareaF.val(' ');
      }
      return;
    }
    let arr = command.split(' ');
    arr.pop();
    let numW = textNum(arr.join(' '));
    if (textareaF && numW) {
      let val = textareaF.val().split(' ').slice(0, -numW);
      textareaF.val(val.join(' '));
    } else return;
  }

  var Small = {
    zero: 0,
    one: 1,
    two: 2,
    three: 3,
    four: 4,
    five: 5,
    six: 6,
    seven: 7,
    eight: 8,
    nine: 9,
    ten: 10,
    eleven: 11,
    twelve: 12,
    thirteen: 13,
    fourteen: 14,
    fifteen: 15,
    sixteen: 16,
    seventeen: 17,
    eighteen: 18,
    nineteen: 19,
    twenty: 20,
    thirty: 30,
    forty: 40,
    fifty: 50,
    sixty: 60,
    seventy: 70,
    eighty: 80,
    ninety: 90,
  };
  var a, n, g;

  function text2num(s) {
    a = s.toString().split(/[\s-]+/);
    n = 0;
    g = 0;
    a.forEach(feach);
    return n + g;
  }

  function feach(w) {
    var x = Small[w];
    if (x != null) {
      g = g + x;
    } else if (w == 'hundred') {
      g = g * 100;
    }
  }

  $(function () {
    $('#voice_commands_acc').accordion({
      collapsible: true,
      // active: false,
      icons: { header: 'icon-down-def', activeHeader: 'icon-down-def' },
      heightStyle: 'content',
    });
  });
  // end voice commands
  // add and remove cookie
  function addCookie(cookieName) {
    let accessibilitySettings = JSON.parse($.cookie('accessibilitySettings') || '{}');
    accessibilitySettings[cookieName] = true;
    $.cookie('accessibilitySettings', JSON.stringify(accessibilitySettings), { expires: 365 });
  }

  function removeCookie(cookieName) {
    let accessibilitySettings = JSON.parse($.cookie('accessibilitySettings') || '{}');
    delete accessibilitySettings[cookieName];
    $.cookie('accessibilitySettings', JSON.stringify(accessibilitySettings), { expires: 365 });
  }
  function addCookieValue(cookieName, cookieValue) {
    let accessibilitySettings = JSON.parse($.cookie('accessibilitySettings') || '{}');
    accessibilitySettings[cookieName] = { enabled: true, value: cookieValue };
    $.cookie('accessibilitySettings', JSON.stringify(accessibilitySettings), { expires: 365 });
  }
  // buttons events
  $(document)
    .off('click touchstart', '#uncolor')
    .on('click touchstart', '#uncolor', function () {
      if (!$('.feature-uncolor-body').length) {
        $('html').addClass('feature-uncolor-body');
        $('html').attr(
          'style',
          '-webkit-filter: grayscale(1) !important;filter: grayscale(1) !important;backdrop-filter: grayscale(1) !important;'
        );
        addCookie('uncolor');
      } else {
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-uncolor-body');
        $('html').css({
          '-webkit-filter': '',
          filter: '',
          'backdrop-filter': '',
        });
        removeCookie('uncolor');
      }
    });

  $(document)
    .off('click touchstart', '#brightContrast')
    .on('click touchstart', '#brightContrast', function () {
      if (!$('.feature-bright-contrast').length) {
        $('html').addClass('feature-bright-contrast');
        $('body').attr('style', 'background: 0 0 !important;');
        $('body').append(
          `<style class="bright-contrast">
          body .main-div-bg *:not(img),
          body .main-div-bg .questionnaire_text p:not(img),
          div[class*="footer"],
          body .radioAnswersDiv span.radioAnswers,
          body .radioAnswersDiv span.radioAnswers.radioAnswersChecked {
            color: #000 !important;
            background-color: #fff !important;
            border-color: #000 !important;
          }
          table[name="qgroup_and_subgroups_vertical"] > colgroup + tbody > :first-child > td,
          table[name="qgroup_and_subgroups_vertical"] > colgroup + tbody > :first-child > td *,
          table[name="qgroup_and_subgroups_vertical"] > tbody:first-child > :first-child > td,
          table[name="qgroup_and_subgroups_vertical"] > tbody:first-child > :first-child > td *,
          table[name="qgroup_and_subgroups_vertical"] > thead:first-child > :first-child > th,
          table[name="qgroup_and_subgroups_vertical"] > thead:first-child > :first-child > th * {
            background-color: #000 !important;
            color: #fff !important;
          }
          
          body .radioAnswersDiv span.radioAnswers,
          body .radioAnswersDiv span.radioAnswers.radioAnswersChecked,
          body input#continue, body input#continue:hover,body  input#goBack, body input#goBack:hover,
          body input#finishCrit,body input#finishCrit:hover{
            -webkit-filter: grayscale(1) !important;
            filter: grayscale(1) !important;
            backdrop-filter: grayscale(1) !important;
          }</style > `
        );
        addCookie('brightContrast');
      } else {
        removeCookie('brightContrast');
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-bright-contrast');
        $('body').css({
          background: '',
        });
        $('.bright-contrast').remove();
      }
    });

  let dyslexia = 0;
  $(document)
    .off('click touchstart', '#dyslexia')
    .on('click touchstart', '#dyslexia', function () {
      dyslexia++;
      if (dyslexia != 3) {
        addCookieValue('dyslexia', dyslexia);
      } else {
        removeCookie('dyslexia');
      }
      if (dyslexia == 1) {
        $('html').addClass('feature-dyslexia-body');
        $('body').append(
          `<link class="dyslexia-font" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;700&display=swap" rel="stylesheet">`
        );
        $('body *').css('font-family', 'Lexend, sans-serif');
        $(this).addClass(`dyslexia-${dyslexia}`);
      } else if (dyslexia == 2) {
        $('html').addClass('feature-dyslexia-body');
        $('.dyslexia-font').remove();
        $('body *').css('font-family', '');
        $('body').append(
          ` <style type="text/css" class="open-dyslexic">
        @font-face {
            font-family: OpenDyslexic;
            font-weight: normal;
            src: url("./fonts/OpenDyslexic/OpenDyslexic-Regular.otf") format("opentype");
        }
        @font-face {
            font-family: OpenDyslexic;
            font-weight: bold;
            src: url("./fonts/OpenDyslexic/OpenDyslexic-Bold.otf") format("opentype");
        }
        @font-face {
            font-family: OpenDyslexic;
            font-weight: bold;
            font-style: italic;
            src: url("./fonts/OpenDyslexic/OpenDyslexic-BoldItalic.otf") format("opentype");
        }
        @font-face {
            font-family: OpenDyslexic;
            font-weight: normal;
            font-style: italic;
            src: url("./fonts/OpenDyslexic/OpenDyslexic-Italic.otf") format("opentype");
        }
    </style>`
        );
        $('body *').css('font-family', 'OpenDyslexic, sans-serif');
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)dyslexia-\S+/g) || []).join(' ');
        });
        $(this).addClass(`dyslexia-${dyslexia}`);
      } else {
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-dyslexia-body');
        $('body *').css('font-family', '');
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)dyslexia-\S+/g) || []).join(' ');
        });
        $('.dyslexia-font').remove();
        $('.open-dyslexic').remove();
        dyslexia = 0;
      }
    });

  $(document)
    .off('click touchstart', '#blackCursor')
    .on('click touchstart', '#blackCursor', function () {
      if ($('.feature-whiteCursor').length) {
        $('body').removeClass('feature-whiteCursor');
        $('.feature-whiteCursor').remove();
      }

      if (!$('.feature-blackCursor').length) {
        $('body').addClass('feature-blackCursor');
        $('body').append(
          `<style class="feature-blackCursor">       
            body.feature-blackCursor {cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAzCAYAAAAZ+mH/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODM1RTg1NDJCQzhFMTFFNzhFNDdGMzY5NjY0M0JBMTQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ODM1RTg1NDNCQzhFMTFFNzhFNDdGMzY5NjY0M0JBMTQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4MzVFODU0MEJDOEUxMUU3OEU0N0YzNjk2NjQzQkExNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4MzVFODU0MUJDOEUxMUU3OEU0N0YzNjk2NjQzQkExNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PisYaokAAAcASURBVHjavFhrTFRHFJ5978pLcFFKHzxkY22RRo3+qy4JgUCsMahJEVEWRIz946LUAq0toolVofLDR0tisLhiUFEETPxhTQyxPqqNSuIjLTZGLI1UgqbyWJbbby5zl7m7d3nIrpN8md1zH/Pdb845c2aIzWZbfe/evSMmk4mwpgU0gBpQMQS0qXt7e3WJiYmFra2te8LCwnSwCR4kAt9Wrlz5ucDa5cuX9xmNRkrEABg5VQKqiOxrrVbrtubm5j2hoaE6Zte+jSlRM7hbSkpK0alTp77R6/Uqdk3L3RcQQorznpqa+uW5c+e+DQkJ0b4NRWQk2traSH9/v/g7PT29uKGhoQyKSCpoPBTxq2PmSI65fv16ITs7WxgYGJBMwoULF76HImG4dRrnrH4lIvMHnU5HHA4HsdvtbhtV5OTJk8W4JgRKERkJjUYj9ocOHRKJDA0N0b+qjIyMsrNnz34VHBwskeB9ROXX6SgsLBRYshKxdetWgWtDLS0t5VBkGpsag0ceCQwJiqKiIsHpdLqZUCJQJNivPjIeCR+KfAdFTH5TZCIkJCIul8vNpKmpqSQIzS+KTJQERVlZGa+IE85aqtVqp67IZEhQlJaWyhRBZp26IpMl4UOREgVFJk7kTUgoKdLY2Fg8DY1TZOIlwJuSoCgvL+cV6cfqW4SEZ+AUmVhxNBUSFBUVFTyR4dOnTxdNWpGpklCr1cKuXbt4IgOTVmSqJHwpAiJ200j1PL4i/iJBFdm9ezdPpO/EiRNfwK4fVxF/kZCwf/9+nshgfX395nEV8TcJ+IInkddQZPOYivibhA9FnFQRBI3Jg8iIIoEiQRWprKyUKXLs2LEClUql81IkUCQkVFVVyRIaiORjg0V9I0giop1KQUTLQVTjBOlb8ToGJTt27CAolMmGDRuoybBu3brq4eFhkpeXV4frWmnz+8YtPDycnD9/Xuzpi5UaJUjJUkKYCmoKys3NPUhtGzduPI4txsSViIqKIl1dXTJbd3c3efjwIcFLJ8vfkJOTc4T6Q0FBwc8TIrF9+3ayZMkSsmLFCoJ6U3bt6NGjJCsrixgMBvq1LnxZF6Zczb6aMN+QzRKDFkS29fT0/DkuiS1bthBkQlHOhQsXkmvXrsmuX79+nVy9epUkJyeL/+F4PyEcf4fcGhChczTMeoH2FMgZLmCQ+mdnZ2fPmCSKi4vJ3r173f/XrFnjRWJwcJDU1dWJJDCAJjo6OunKlSv1zN9cDMMMAuupzcngkoXopk2bZEULnI0PL+H58+dCZGSkVxiGhoYKT548GSnFh4b+Wbp0aQbsCYAFiAXeB94DohmiADP1bSBE7flVtO3cuVOcAmlesTftoCuj2Wwma9eu9VLs5cuXpLa2VgrbmQjDT+lj9JWsp7vsPobXrB9kSgzJlICnCiUlJbKvP3PmzPG0tLRMEOml/+EDAvY+XmokJSUJcDLxGfT3IyIiPoT9XSASmA5IGyYTg5ElK52MxKNHj2RTgE2OA5uc+bjxoxs3bjRSG60rsUlWzI4g7H4WaubBNoMhxD3g6LZgFDwJvqGUr0Wm+wQ3JQKz8/Pzc2nVRK/B+xVJLFu2zP387du3W+A/kYwEVUHvsYyrFBcwjkANSviPcQOVdA4QHxcXZ+no6PhVrFb6+oSEhAQvEnhGuHPnjvSaF9jNp8AeypQw+toYqT0NIHAwOzu7El4+4jQjTjX4+PHj7osXLzbSe2h822w2LwelRwk0eUlZHWk5jTtK8H2mwSnhAoEqfE0cC6945lgzWThFLFq0yIII6qQ3P3jwQDFcY2JihKdPnwpMsb8sFsscbkoMikRWrVplow80NzdXYDdHY/gDIIbF8wxOTtoHIVn9IOmNdK3oGzU1Ne6pPXDgwGbYwliEmLgDltGGxWf1zZs392FJpoPM4pKJ5NUm9gW010E5K94thuulS5cUScydO1fAGiKSwAL3CxY/+s4IpobOSw3IF44kNJ2xNbPBpbg2cmEl1oi4N6S9vb2FZUdh8eLFMgLz5s0Tqqur+cO315mZmZ9xahqUHFTHBgthkJKK3iOmtUwNPerHLGmEw4cPi2l7+fLldD8qO/mT2t27d39CvglnJIxKU6JjAxo56D121tLprqhGfHz8O5C7XYzDFy8ETKdSqqGJ7z8QaMCUZyKdz2Jqm7h3j1ZpzKj1+HLPY2Q1rwYSVongo7169eoPh8PxY2pqajp8bTbzMYmEUYmEioth9RhHgypGTky/Vqt1Psb7mxvb9ezZs9+wL/0aoZzMQtzChbqZS99ePqFSwFjnnmLJjpSuu3XrFi1W/21ra2uy2+05sCXRFM8Gt3Chbmb+YFKKjskecqk4IuoFCxYkxMbGmltbW+/DITVMasIyrVOh54scd+n3vwADAK1sS+5aX9ZxAAAAAElFTkSuQmCC),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/b2.cur),auto!important
            }
            body.feature-blackCursor a,
            body.feature-blackCursor span[onclick],
            body.feature-blackCursor button,
            body.feature-blackCursor input,
            body.feature-blackCursor label {
            cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA1CAYAAAADOrgJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUIxMTcwRTBCQTVCMTFFNzlFMTNDNDI4RjQ5NjYzNDAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUIxMTcwRTFCQTVCMTFFNzlFMTNDNDI4RjQ5NjYzNDAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5QjExNzBERUJBNUIxMUU3OUUxM0M0MjhGNDk2NjM0MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5QjExNzBERkJBNUIxMUU3OUUxM0M0MjhGNDk2NjM0MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PsArU6kAAAuPSURBVHjazFoJcE1L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),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/bh2.cur),auto!important
            }
          </style > `
        );
        addCookie('blackCursor');
      } else {
        removeCookie('blackCursor');

        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('body').removeClass('feature-blackCursor');
        $('.feature-blackCursor').remove();
      }
    });

  $(document)
    .off('click touchstart', '#whiteCursor')
    .on('click touchstart', '#whiteCursor', function () {
      if ($('.feature-blackCursor').length) {
        $('body').removeClass('feature-blackCursor');
        $('.feature-blackCursor').remove();
      }
      if (!$('.feature-whiteCursor').length) {
        $('body').addClass('feature-whiteCursor');
        $('body').append(
          `<style class="feature-whiteCursor">       
            body.feature-whiteCursor {cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAzCAYAAAAZ+mH/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RDA1OTE2NURCQzkyMTFFN0IwODJCQjE5QzZFMDg2QjYiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RDA1OTE2NUVCQzkyMTFFN0IwODJCQjE5QzZFMDg2QjYiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpEMDU5MTY1QkJDOTIxMUU3QjA4MkJCMTlDNkUwODZCNiIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpEMDU5MTY1Q0JDOTIxMUU3QjA4MkJCMTlDNkUwODZCNiIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/Phwph8YAAAWrSURBVHjavFldSGxVFF7zq+N4/RtTuY1SU2SWoqUW/iAZhL1UFD4kVBD02Jv45os/+Psi+CCU9hRYkGVF1kOUmEYZpmGJEpqJ4Ev5e/XqzDi7tU5rz92zx7nqzBwXfBxn73P2/va311pnnS0AwDuI3xG34H9zIGwMC8NUsyIOEU8iphAexDnCzn2mE5AkrPx3PRPJZiJSEavZiqgkyJ5BfInIQQSZiOmKXDRBDSuSc1OKxFplJWISkasQMU2RiIF9Ph+kpqbKn88ivmAiIYTTLEVUfzAIeL1ecLlcsulpxKdmKxIxYFpaGrS0tEBOTg44nU7VWT83W5G3EIJQWVkpyAYGBkRBQYFAZYTsQ/yM8JJgxDfZqoRJVFRUiGAwaBDp6uoS+fn5AhVRiSwoRNxK5CSsSAQJv98vpPX19Ym8vLwbUSQmiZtU5L4kVEVSUlJMU+RSElKR3Nxc4XA4TFHkSiTIent7hcfjMUWRK5OQihCRZCtyLRJmKXJtElIRzKxJUyQuElKR7OxsPXzjUiRuEmSdnZ0GkUQVSYhEshRJmIRUJCsrK25FkkKCrKenR2RmZsalSNJIkHV0dIiMjAxht9uvpUhSScSrSNJJXKLIgxoRm2kkyPr7+w0imiI/MZEUScSeSCESCoXg9PQULJboqKO21tZW2Nvbg7GxMeOKVZtaxb+E+DdhEoeHh1BbWwv7+/sxidhsNkB14fz8XO2SVfxrRORKJI6OjoyJsPgFzAPhdrfbbUyws7MTzxqkIq9YL7uzu7sbsAqHkpISWFpaitqOsrIyQOeLV0z60hu779PoWDA8PAy7u7uGnFjmwcTERLgfX+XQ1tYGk5OThvToi9T8B+JDzgdB/lYJ8ceT/DvIvwOI7SgSVqs1rAARoG1gh4KFhQWYnZ2F+vr6yOWgUouLi5IE2TziH46GAE94rhChq5/7QhHbQU5EGBwchKGhITg4ODD2XNrW1haMj49HECDHbGxsNJ5jowOXF3i1enq2cJuNv+RSOVfcyxNVVVWivb39ooI2jObmZrG9vR2RD3C7RGFhoXrfPqIC8RjiIcRtRB5/Snr42IGQhUgnRuWIV4kNJhaYn583YlpVAO2uZLyysgINDQ1QXFwcDkvyDdqy6elpw1k5EZ0hvmf5z1j6gOIPQcVn7ilB3xZadiN8gHhZ/qb+8vLyqOw4MzNj9KNPyee+46On23x1MzknL8jBZ2P2CCWOj4/VpLKMGER8hjhA0HlBOfXTyskJa2pqIhLTxsYGrK6uhtMI4hfEX+wLAc05Q3JhsfIEhdm7iK/5YUqvi6qD0oSqFRUVQVNTE2AVLpvIB15n59MdVFcb3tQafuVzK/LyUkQx4mHEUwhapsBVi9LSUrG8vBy1LT6fz+hXxitmQrd4O2x6QaMr8RvibY5xku2YQV76J+ITkpG2Ym1tDaampiAQCIQfPjk5gerqasPB2fycngXvvy1WjfmGUnQ8TsoiHuVrgRJSHn4F79L9FMK0at0wmYn09HRVjTlW4gEKR3bMiO0hZnWIR/jVesRee8bwK2FFA95hvEihSMdKlC3JH1TfoCw7Nzcnmyg61tmnbJpTGkYSzSC+ReyxR9/lmwJKLAO3+fk+2irb+vo6jI6OQl1dHZydncHIyAhsbm4a+UJNxIhMmWeUA1yhErGyRJmcwTJYNpd22O5kkuTtP8icQNkV07yRbb1e74VZlsk/weO7lS0Jm1Op+dJ48hStELWyai5Gs5zA5XIZH8daRKggZd/jbfFofhEhl13LYvq/GiyKYum8oh9jTCoU//kK8TyHuJffHVFK2Hmv9bAR2hUUvwjxvyfe53yiP0eVz0cc5tM8oUV5Xwh9XHuMyWKZ4MFoFX8zGZkUyME/5lrijqx7tEiTL6+I+a57yCVrAQcP+BznFLJvlC1Vixa/gqDy/ggr8p8AAwB38ep+f+/fmwAAAABJRU5ErkJggg==),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/w2.cur),auto!important
            }
            body.feature-whiteCursor a,
            body.feature-whiteCursor button,
            body.feature-whiteCursor span[onclick],
            body.feature-whiteCursor input,
            body.feature-whiteCursor label {cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAtCAYAAAAz8ULgAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkE0QzFBMjdCQzkyMTFFNzg4RDE5NkYzNkM0MDkwNzAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkE0QzFBMjhCQzkyMTFFNzg4RDE5NkYzNkM0MDkwNzAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGQTRDMUEyNUJDOTIxMUU3ODhEMTk2RjM2QzQwOTA3MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGQTRDMUEyNkJDOTIxMUU3ODhEMTk2RjM2QzQwOTA3MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnfOpO8AAAhdSURBVHjaxFlpTBVX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),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/wh2.cur),auto!important
            }
          </style > `
        );
        addCookie('whiteCursor');
      } else {
        removeCookie('whiteCursor');
        $('body').removeClass('feature-whiteCursor');
        $('.feature-whiteCursor').remove();
      }
    });

  let speechCount = 0;
  $(document)
    .off('click touchstart', '#speech')
    .on('click touchstart', '#speech', function () {
      speechCount++;
      if (speechCount != 4) {
        addCookieValue('speech', speechCount);
      } else {
        removeCookie('speech');
      }
      speechSynthesis.cancel();
      if (speechCount == 4 && $('.feature-speech-enable').length) {
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-speech-enable');
        speechDisable();
        speechCount = 0;
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)speechCount-\S+/g) || []).join(' ');
        });
      } else {
        $('html').addClass('feature-speech-enable');
        speechEnable();
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)speechCount-\S+/g) || []).join(' ');
        });

        if (speechCount == 2) {
          speechSpeed = 0.7;
        } else if (speechCount == 3) {
          speechSpeed = 1.2;
        }
        $(this).addClass(`speechCount-${speechCount}`);
      }
    });

  $(document)
    .off('click touchstart', '#tabNav')
    .on('click touchstart', '#tabNav', function () {
      let questionArea = document.querySelector('#question-area ');
      if (!$('.feature-tab-enable').length) {
        $('html').addClass('feature-tab-enable');
        addTabIndex();
        questionArea.addEventListener('focusin', highlightElement);

        addCookie('tabNav');
      } else {
        removeCookie('tabNav');
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-tab-enable');
        removeTabIndex();
        questionArea.removeEventListener('focusin', highlightElement);
        questionArea.removeEventListener('focus', speechTab);
        let prevSelected = document.querySelector('[style*="box-shadow"]');
        $(prevSelected).css({
          outline: '',
          background: '',
          color: '',
          '-webkit-box-shadow': '',
          'box-shadow': '',
          'text-shadow': '',
        });
      }
    });

  $(document)
    .off('click touchstart', '#readMask')
    .on('click touchstart', '#readMask', function () {
      if (!$('.feature-read-mask').length) {
        $('html').addClass('feature-read-mask');
        readingMask.initialize();
        addCookie('readMask');
      } else {
        removeCookie('readMask');
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-read-mask');
        readingMask.removeCanvas();
      }
    });

  $(document)
    .off('click touchstart', '#readGuide')
    .on('click touchstart', '#readGuide', function () {
      if (!$('.feature-read-guide').length) {
        $('html').addClass('feature-read-guide');
        init_pointer({
          ringSize: 2,
        });
        addCookie('readGuide');
      } else {
        removeCookie('readGuide');
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-read-guide');
        isRunning = false;
        $('#pointer-ring').remove();
        $('#pointer-dot').remove();
      }
    });

  let fontSizeCount = 0;

  $(document)
    .off('click touchstart', '#fontSize')
    .on('click touchstart', '#fontSize', function () {
      fontSizeCount++;
      if (fontSizeCount != 4) {
        addCookieValue('fontSize', fontSizeCount);
      } else {
        removeCookie('fontSize');
      }
      if (fontSizeCount === 4) {
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-font-size');
        fontSizeDecrease();
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)font-\S+/g) || []).join(' ');
        });
        fontSizeCount = 0;
      } else {
        $('html').addClass('feature-font-size');
        $(this).addClass(`font-${fontSizeCount}`);
        fontSizeIncrease(fontSizeCount);
      }
    });

  let spacing = 0;

  $(document)
    .off('click touchstart', '#spacing')
    .on('click touchstart', '#spacing', function () {
      spacing++;
      if (fontSizeCount != 3) {
        addCookieValue('spacing', spacing);
      } else {
        removeCookie('spacing');
      }
      if (spacing === 3) {
        $('html').removeClass('feature-spacing');
        spaceDecrease();
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)spacing-\S+/g) || []).join(' ');
        });
        spacing = 0;
      } else {
        $('html').addClass('feature-spacing');
        $(this).addClass(`spacing-${spacing}`);
        spaceIncrease(spacing);
      }
    });

  let lineHeight = 0;

  $(document)
    .off('click touchstart', '#lineHeight')
    .on('click touchstart', '#lineHeight', function () {
      lineHeight++;
      if (lineHeight != 3) {
        addCookieValue('lineHeight', lineHeight);
      } else {
        removeCookie('lineHeight');
      }

      if (lineHeight === 3) {
        $('html').removeClass('feature-lineHeight');
        lineDecrease();
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)lineHeight-\S+/g) || []).join(' ');
        });
        lineHeight = 0;
      } else {
        $('html').addClass('feature-lineHeight');
        $(this).addClass(`lineHeight-${lineHeight}`);
        lineIncrease(lineHeight);
      }
    });

  let zoomLevel = 0;
  $(document)
    .off('click touchstart', '#zoom')
    .on('click touchstart', '#zoom', function () {
      zoomLevel++;
      if (!$('.feature-zoom').length && zoomLevel == 1) {
        $('html').addClass('feature-zoom');
        let oldStyle = $('body').attr('style') ? $('body').attr('style') : '';
        $('body').attr(
          'style',
          'zoom: 1.5 !important;-moz-transform: scale(1.5) !important;-moz-transform-origin: 15% 0 !important;' +
            oldStyle
        );
        addCookieValue('zoom', zoomLevel);
        $(this).addClass(`zoomLevel-${zoomLevel}`);
      } else if (zoomLevel == 2) {
        $('html').addClass('feature-zoom');
        $('body').css({
          '-moz-transform': '',
          zoom: '',
          '-moz-transform-origin': '',
        });
        $('html').addClass('feature-zoom');
        let oldStyle = $('body').attr('style') ? $('body').attr('style') : '';
        $('body').attr(
          'style',
          'zoom: 2 !important;-moz-transform: scale(2) !important;-moz-transform-origin: 30% 0 !important;' +
            oldStyle
        );
        addCookieValue('zoom', zoomLevel);
        $(this).addClass(`zoomLevel-${zoomLevel}`);
      } else if (zoomLevel == 3) {
        $('html').addClass('feature-zoom');
        $('body').css({
          '-moz-transform': '',
          zoom: '',
          '-moz-transform-origin': '',
        });
        $('html').addClass('feature-zoom');
        let oldStyle = $('body').attr('style') ? $('body').attr('style') : '';
        $('body').attr(
          'style',
          'zoom: 2.5 !important;-moz-transform: scale(2.5) !important;-moz-transform-origin: 40% 0 !important;' +
            oldStyle
        );
        addCookieValue('zoom', zoomLevel);
        $(this).addClass(`zoomLevel-${zoomLevel}`);
      } else {
        removeCookie('zoom');
        $('html').removeClass('feature-zoom');
        $('body').css({
          '-moz-transform': '',
          zoom: '',
          '-moz-transform-origin': '',
        });

        lineDecrease();
        $(this).removeClass(function (index, className) {
          return (className.match(/(^|\s)zoomLevel-\S+/g) || []).join(' ');
        });
        zoomLevel = 0;
      }
    });

  $(document)
    .off('click touchstart', '#hideImg')
    .on('click touchstart', '#hideImg', function () {
      if (!$('.feature-hide-img').length) {
        $('html').addClass('feature-hide-img');
        hideImg();
        addCookie('hideImg');
      } else {
        $('html').removeClass('feature-hide-img');
        showImg();
        removeCookie('hideImg');
      }
    });

  $(document)
    .off('click touchstart', '#tooltip')
    .on('click touchstart', '#tooltip', function () {
      if (!$('.feature-tooltip').length) {
        $('html').addClass('feature-tooltip');
        tooltipEnabled = true;
        addCookie('tooltip');
      } else {
        removeCookie('tooltip');
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-tooltip');
        tooltipEnabled = false;
      }
    });

  var speechHTML = ` <div class="center speech-group">
                            <div class="info-speech">
                            <p class="info_start" style="display: none">Click on the microphone icon and begin speaking
                            </p>
                            <p class="info_speak_now" style="display: none">Speak now.</p>
                            <p class="info_no_speech" style="display: none">No speech was detected. You may need to
                                adjust your microphone
                                settings.
                            </p>
                            <p class="info_no_microphone" style="display:none">No microphone was found. Ensure that a
                                microphone is installed and
                                that settings are configured correctly.</p>
                            <p class="info_allow" style="display: none">Click the "Allow" button above to enable your
                                microphone.</p>
                            <p class="info_denied" style="display: none">Permission to use microphone was denied.</p>
                            <p class="info_blocked" style="display: none">Permission to use microphone is blocked.</p>
                            <p class="info_upgrade" style="display: none">Web Speech API is not supported by this
                                browser.</p>
                        </div>
                            <button class="start_button" type="button">
                                <img class="start_img"
                                    src="data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20d%3D%22M0%200h24v24H0V0z%22%2F%3E%3Cpath%20d%3D%22M12%2015c1.66%200%202.99-1.34%202.99-3L15%206c0-1.66-1.34-3-3-3S9%204.34%209%206v6c0%201.66%201.34%203%203%203zm-1.2-9.1c0-.66.54-1.2%201.2-1.2s1.2.54%201.2%201.2l-.01%206.2c0%20.66-.53%201.2-1.19%201.2s-1.2-.54-1.2-1.2V5.9zm6.5%206.1c0%203-2.54%205.1-5.3%205.1S6.7%2015%206.7%2012H5c0%203.41%202.72%206.23%206%206.72V22h2v-3.28c3.28-.48%206-3.3%206-6.72h-1.7z%22%2F%3E%3C%2Fsvg%3E"
                                    alt="Start">
                            </button>
                           
                        <div class="results" style="display: none;">
                            <span class="final_span" class="final"></span>
                            <span class="interim_span" class="interim"></span>
                            <p>
                        </div>
                        </div>`;

  $(document)
    .off('click touchstart', '#speechTextarea')
    .on('click touchstart', '#speechTextarea', function () {
      let startBtn;
      let questionArea = document.querySelector('#question-area ');
      if (!$('.feature-speech').length) {
        $('html').addClass('feature-speech');
        if ($('.questDiv textarea').length) {
          // $('.questDiv').append(speechHTML);

          $('.questDiv textarea').each(function () {
            console.log($(this).closest('.questDiv'));
            $($(this).closest('.questDiv')).append(speechHTML);
          });
          $('.info_start').css('display', 'inline');
          $('.info-speech').css('visibility', 'visible');
          if ($('.feature-tab-enable').length) {
            removeTabIndex();
            addTabIndex();
            questionArea.addEventListener('focusin', highlightElement);
          }
          startBtn = $('.start_button');
          if (!('webkitSpeechRecognition' in window)) {
            upgrade();
            return;
          }
          startBtn.on('click', function (event) {
            event.preventDefault(); // prevent form submission
            speechStartBtn(event);
          });
        }
        addCookie('speechTextarea');
      } else {
        removeCookie('speechTextarea');
        if (recognizing) {
          recognition.stop();
        }
        $('html').removeClass(
          'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
        );
        $('html').removeClass('feature-speech');
        startBtn = $('.start_button');
        startBtn.off('click');
        $('.speech-group').remove();
      }
    });

  // profiles

  $(document)
    .off('click touchstart', '#epilepsy')
    .on('click touchstart', '#epilepsy', function () {
      if (!$('.feature-epilepsy-profile').length) {
        clearFeature();
        addCookie('epilepsy');
        $('html').addClass('feature-epilepsy-profile');
        $('#uncolor').trigger('click');
        $('#brightContrast').trigger('click');
      } else {
        removeCookie('epilepsy');
        $('html').removeClass('feature-epilepsy-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#vision')
    .on('click touchstart', '#vision', function () {
      if (!$('.feature-vision-profile').length) {
        clearFeature();
        addCookie('vision');
        $('html').addClass('feature-vision-profile');
        $('#fontSize').trigger('click');
        $('#dyslexia').trigger('click');
        $('#blackCursor').trigger('click');
        $('#tooltip').trigger('click');
      } else {
        removeCookie('vision');
        $('html').removeClass('feature-vision-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#cognitive')
    .on('click touchstart', '#cognitive', function () {
      if (!$('.feature-cognitive-profile').length) {
        clearFeature();
        addCookie('cognitive');
        $('html').addClass('feature-cognitive-profile');
        $('#fontSize').trigger('click');
        $('#readGuide').trigger('click');
        $('#tooltip').trigger('click');
      } else {
        removeCookie('cognitive');
        $('html').removeClass('feature-cognitive-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#adha')
    .on('click touchstart', '#adha', function () {
      if (!$('.feature-adha-profile').length) {
        clearFeature();
        addCookie('adha');
        $('html').addClass('feature-adha-profile');
        $('#uncolor').trigger('click');
        $('#readMask').trigger('click');
      } else {
        removeCookie('adha');
        $('html').removeClass('feature-adha-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#blind')
    .on('click touchstart', '#blind', function () {
      if (!$('.feature-blind-profile').length) {
        clearFeature();
        addCookie('blind');
        $('html').addClass('feature-blind-profile');
        $('#speechTextarea').trigger('click');
        $('#speech').trigger('click');
      } else {
        removeCookie('blind');
        $('html').removeClass('feature-blind-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#keyboard')
    .on('click touchstart', '#keyboard', function () {
      if (!$('.feature-keyboard-profile').length) {
        clearFeature();
        addCookie('keyboard');
        $('html').addClass('feature-keyboard-profile');
        $('#tabNav').trigger('click');
      } else {
        removeCookie('keyboard');
        $('html').removeClass('feature-keyboard-profile');
        clearFeature();
      }
    });

  $(document)
    .off('click touchstart', '#voiceCommands')
    .on('click touchstart', '#voiceCommands', function () {
      let startBtn = document.querySelector('#start_button_vc');
      if (!$('.feature-voice-commands').length) {
        selectGroups();
        $('html').addClass('feature-voice-commands');
        $('#info').html('Click on the microphone icon and begin speaking');
        startBtn.addEventListener('click', speechVoiceCom);
        startBtn.click();
        addCookie('voiceCommands');
      } else {
        stopVNav();
        startBtn.removeEventListener('click', speechVoiceCom);
        removeCookie('voiceCommands');
      }
    });

  // clear button

  function clearFeature() {
    $.removeCookie('accessibilitySettings');
    var featureButtons = {
      'feature-bright-contrast': '#brightContrast',
      'feature-dyslexia-body': '#dyslexia',
      'feature-uncolor-body': '#uncolor',
      'feature-blackCursor': '#blackCursor',
      'feature-whiteCursor': '#whiteCursor',
      'feature-speech-enable': '#speech',
      'feature-tab-enable': '#tabNav',
      'feature-read-mask': '#readMask',
      'feature-read-guide': '#readGuide',
      'feature-font-size': '#fontSize',
      'feature-spacing': '#spacing',
      'feature-lineHeight': '#lineHeight',
      'feature-hide-img': '#hideImg',
      'feature-zoom': '#zoom',
      'feature-tooltip': '#tooltip',
      'feature-speech': '#speechTextarea',
      'feature-voice-commands': '#voiceCommands',
    };

    for (var feature in featureButtons) {
      $('html').removeClass(
        'feature-epilepsy-profile feature-vision-profile feature-cognitive-profile feature-adha-profile feature-blind-profile feature-keyboard-profile'
      );
      if ($('body').hasClass(feature) || $('html').hasClass(feature)) {
        if (feature == 'feature-font-size') {
          fontSizeCount = 3;
        }
        if (feature == 'feature-dyslexia-body') {
          dyslexia = 2;
        }
        if (feature == 'feature-spacing') {
          spacing = 2;
        }
        if (feature == 'feature-lineHeight') {
          spacing = 2;
        }
        if (feature == 'feature-zoom') {
          zoomLevel = 3;
        }
        if (feature == 'feature-dyslexia-body') {
          dyslexia = 2;
        }

        $(featureButtons[feature]).click();
      }
    }
  }
  $(document)
    .off('click touchstart', '#clearFeature')
    .on('click touchstart', '#clearFeature', function (event) {
      event.preventDefault();
      clearFeature();
    });

  //cookies loading

  function loadCookieSettings() {
    const cookieValue = $.cookie('accessibilitySettings');
    if (cookieValue) {
      const settings = JSON.parse(cookieValue);
      let profile = 0;
      $.each(settings, function (id, value) {
        if (
          id == 'epilepsy' ||
          id == 'vision' ||
          id == 'cognitive' ||
          id == 'adha' ||
          id == 'blind' ||
          id == 'keyboard'
        ) {
          profile++;
          const el = $(`#${id}`);
          el.click();
        }
      });
      if (profile) {
        return;
      }
      $.each(settings, function (id, value) {
        const el = $(`#${id}`);
        if (el.length > 0) {
          if (typeof value === 'object' && value.enabled === true) {
            if (id === 'dyslexia') {
              dyslexia = value.value - 1;
              el.click();
              // $('body').css('font-size', `${value.fontSize}px`);
            } else if (id === 'speech') {
              speechCount = value.value - 1;
              el.click();
            } else if (id === 'fontSize') {
              fontSizeCount = value.value - 1;
              el.click();
            } else if (id === 'spacing') {
              spacing = value.value - 1;
              el.click();
            } else if (id === 'lineHeight') {
              lineHeight = value.value - 1;
              el.click();
            } else if (id === 'zoom') {
              zoomLevel = value.value - 1;
              el.click();
            } else {
              el.click();
            }
          } else if (value === true) {
            el.click();
          }
        }
      });
    }
  }

  loadCookieSettings();
  $(function () {
    $('#accordion').accordion({
      collapsible: true,
      active: false,
      icons: { header: 'icon-down-def', activeHeader: 'icon-down-def' },
      heightStyle: 'content',
    });
  });
});
