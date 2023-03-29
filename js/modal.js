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
      openBtn.addEventListener('click', () => {
        modalContainer.classList.add('show-accessibility');
      });
    }
  };
  showModalEffect1('open-accessibility', 'modal-container');

  /* ------------- CLOSE MODAL ------------- */

  const closeBtn = document.querySelectorAll('.close-modal');

  function closeModal() {
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
          if (code != 'en') {
            voices = voices.filter(voice => voice.lang.startsWith(code));
          } else {
            let eng_voices = voices.filter(voice => voice.name == 'Daniel');
            voices = eng_voices.length ? eng_voices : voices;
          }
          resolve(voices);
        } else {
          setTimeout(waitForVoices, 50);
        }
      }
      waitForVoices();
    });
  }

  async function speak(text, rate, pitch, volume, target) {
    let result = await getLanguage(text);
    console.log('res', result);
    // create a SpeechSynthesisUtterance to configure the how text to be spoken
    let speakData = new SpeechSynthesisUtterance();
    speakData.volume = volume; // From 0 to 1
    speakData.rate = rate; // From 0.1 to 10
    speakData.pitch = pitch; // From 0 to 2
    speakData.text = text;
    speakData.lang = result;
    let voices = await getVoices(result);
    speakData.voice = voices[0];
    // pass the SpeechSynthesisUtterance to speechSynthesis.speak to start speaking
    await new Promise((resolve, reject) => {
      speakData.onend = () => {
        resolve();

        target.style.removeProperty('background-color');
      };
      speakData.onerror = error => {
        reject(error);
      };
      speechSynthesis.speak(speakData);
    });
  }
  var speech = function speech(event) {
    event.target.style.backgroundColor = 'yellow';

    let rate = 0.9,
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
      let tags = document.querySelectorAll('p,a,h1,h2,h3, td, label, b, span'); // add more tags for you project
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
      'p, label, td, b, span.questText, .questDiv, span.radioAnswers'
    );
    console.log(childElements);

    childElements.forEach(elem => {
      let hasText = false;
      let children = elem.childNodes;
      for (let i = 0; i < children.length; i++) {
        if (elem.classList.contains('radioAnswers')) {
          hasText = true;
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

  function highlightElement(evt) {
    let prevSelected = document.querySelector('[style*="-webkit-box-shadow"]');
    if (prevSelected && prevSelected !== evt.target) {
      $(prevSelected).css({
        outline: '',
        background: '',
        color: '',
        '-webkit-box-shadow': '',
        'box-shadow': '',
        'text-shadow': '',
      });
    }
    let oldStyle = $(evt.target).attr('style') ? $(evt.target).attr('style') : '';

    var attr = $(evt.target).attr('tabindex');

    // For some browsers, `attr` is undefined; for others,
    // `attr` is false.  Check for both.
    if (typeof attr !== 'undefined' && attr !== false) {
      $(evt.target).attr(
        'style',
        'outline: 0 !important;background: #000 !important;color: #fff !important;-webkit-box-shadow: none !important;box-shadow: none !important;text-shadow: none!important;' +
          oldStyle
      );
    }
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
      } else {
        $('html').removeClass('feature-uncolor-body');
        $('html').css({
          '-webkit-filter': '',
          filter: '',
          'backdrop-filter': '',
        });
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
      } else {
        $('html').removeClass('feature-bright-contrast');
        $('body').css({
          background: '',
        });
        $('.bright-contrast').remove();
      }
    });

  $(document)
    .off('click touchstart', '#dyslexia')
    .on('click touchstart', '#dyslexia', function () {
      if (!$('.feature-dyslexia-body').length) {
        $('html').addClass('feature-dyslexia-body');
        $('body').append(
          `<link class="dyslexia-font" href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;700&display=swap" rel="stylesheet">`
        );
        $('body *').css('font-family', 'Lexend, sans-serif');
      } else {
        $('html').removeClass('feature-dyslexia-body');
        $('.dyslexia-font').remove();
        $('body *').css('font-family', '');
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
            body.feature-blackCursor {cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAzCAYAAAAZ+mH/AAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6ODM1RTg1NDJCQzhFMTFFNzhFNDdGMzY5NjY0M0JBMTQiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6ODM1RTg1NDNCQzhFMTFFNzhFNDdGMzY5NjY0M0JBMTQiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo4MzVFODU0MEJDOEUxMUU3OEU0N0YzNjk2NjQzQkExNCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo4MzVFODU0MUJDOEUxMUU3OEU0N0YzNjk2NjQzQkExNCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PisYaokAAAcASURBVHjavFhrTFRH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),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/b2.cur),auto!important
            }
            body.feature-blackCursor a,
            body.feature-blackCursor button,
            body.feature-blackCursor input {
            cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADIAAAA1CAYAAAADOrgJAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6OUIxMTcwRTBCQTVCMTFFNzlFMTNDNDI4RjQ5NjYzNDAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6OUIxMTcwRTFCQTVCMTFFNzlFMTNDNDI4RjQ5NjYzNDAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5QjExNzBERUJBNUIxMUU3OUUxM0M0MjhGNDk2NjM0MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDo5QjExNzBERkJBNUIxMUU3OUUxM0M0MjhGNDk2NjM0MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PsArU6kAAAuPSURBVHjazFoJcE1LGu57c28iCRERSxBRQSwxZZnEUNb3wihqGNSzxlBTQlJG8GIUxlMqyv6IMlTZhmIKsZXBBAkeMWQsZa0RYjBi3wVZZLu35/tbn7y+556b3AR5uqrr3PTpc05//W/f/3dMrHLNpLvqG9ddq62ZqjDX1SKt6HZ5v9oBWSoBwIxuGzJkyHe/R1MnLFiwYNmdO3f+g5810Et/KTDuNALBhg0bNsqGxnXt3r17D5s2bdoWUzzQfaR0POQmmL4mELQo9uDBg0e08Lt37/IlS5bw1atX8zdv3ggwkEh2cHBwGykVbwnG/DUBEQuZOXPmDyVo79+/51FRUZrq8FGjRvFXr14JMLGxsXMxVgu9tgRk0aT5NYAQ0li6dOlKWuzly5e5n58fV+yAJyUlCSBPnjzJxd9N0etJQF6Kin153XenlZaWkkdiUCuWn5/vcG/r1q0MdsICAwO9ExMT/4KhYikNj+pSLXNlVcxsNouutuvXr7MzZ84wq9XqERAQ0EC+V7WRL270ZncB+Pj4+NK1YcOGzNfX12ECHBk7evQog+Ez2My3Xbp0+a10w9avTbWsqampR2HUb8PCwljdunWdJpBUYCN0z69WrVqBEoDazV9SMu4AIYO2pqWl/ePRo0cv69Spwxo3buw0Ce5XAIHNM7vdrkkhX3ayGZt8l8UApAZU7ZUCbXFzHhm6t6enp9XDw4Mh+DlNIAfw4sULAQSSy61fv36LESNG9AGoYpPJZKO+f//+lIcPH/5XqlxJOVSHy28yd9mBxQ1paFf7GzICxpr17t2bbdu2zXEiANy/f5+9ffuWLV++fCZUzKdjx47B6pw/oXXv3j3q3bt3eXv37v177dq1a2nPAihLTk7es379+r/KGGRTAJk+B+UhMXtSb9eu3bcUL06fPs1h8A6xhPqgQYM4wHAKmoid/Pz58xwL5ikpKWKMGrzblUOHDqVzFy0mJuZ7+V0f+V1Nzcw6W6tSUCRxW8LDw3vRx7Kzs3mbNm2cgERERBDv4i9fvuTYXQ4PJ8YtFosACbUqW/Dr169FIJ0wYQIxAp6e/hEbVJEPHjz4jzVq1AiAPYb4+/s3Rg9S1mGtLCCTshMiJrRv315IpKCgQCxADwRci8N7CaB9+vRxur9p0yaOwMo/fPjAo6OjHe5h0fzEiRMCzI4dO1IvXbqUWYxWWFhIl+Jp06bNluvylpKyuAKjLtyoeYCaNMRH/kkEmHZTv1DsolAjeDAhHf19WjzxMurNmjVzup+QkMCLioq4RrABQoDWWlxc3AwEY7IfXz0YiwEYe9++fQcgAHrjWQEOzXzx4sXrjx8/zrxx48b/KLJHRkYycsU5OTllD+PD7MqVKwy2xLy8vJx24tq1awyGLvpHv+HYIAX29OlT1qBBAwY7YitXrmS5ubls1qxZFGjZ2rVrl0Hit2BnaVJLio2kISQxceLESUZGCAC3Fy1a9GOrVq26Z2VlPaLdQgR32lWoAEe84dgMp3uhoaHChnbv3s1BZwxVExvBnz9/zjt16lQ2jo0ps69evXqNxlhNHcMWEhE6RtseHx+fsGrVqhX0N3ZfBDkYKoNtMBh3C/Q/45Y/DDUXgAwDY2ZmpiCWtJP6RpKg+xkZGQxezek+uW6S6tmzZ9nNmzfLxinQkqSaNGlCrtoqWTWTsagscIof2KGaZFiEGiLmWHyZx6HdPX78eJnukrGT7s6YMcNpVxE0eevWrYW96O9RB0N2SgPU3q1bt7Jvax1ei9y2+DbiUAzGyIvVl5LRXPRHSgAgfjBCke7169fP6QNgtRx0XRggdo7n5eVx6LHLBX3OTkBOnjwpXDOAxMmch8D4aUDMehvRIrS+kXFOnjyZIcAJdSPGS6KuWbNmtWR4cNuiY30eRnxMBWICYvEHXKPhy0jvp0+fLii7lpNATaoFCK1Nrs8wv1Fjhgl6XYM4DzwP5R+GL4RHofIPEUMGus4aNWr0xUEQUaV1ERDSmPJovAliyx0/fvxkxIX3MDg2adIkly9G3k45PFVVhLhdNUrAYPw/7xQWQ7kMyKL4rTWaU69ePaGyRs3b25uyT5cgVDBWSdLYxo0b95LBg5Jz0HCXBgjVEg7A1T1IVMQKSMzBYQCAGEPAFGPYbTGP5rt6X+fOnYUnJU/Zo0ePeNJ+9MYylnipxq6VOv2gNj/C1z+kHZo7d66IIa501ig6a3k9qSY5BFVitPMkCRrXdpd2msZpnlFsoUZShOdiiF8F1BQ6z1VpcAUMeazrAwYM+A6R/H7btm1ZYmKioCKVbUZq4GpMG1fVTW1I0oTqbd68+Rgkc05GdIf8RJWITRYMvKD7d8Bex2IHiqKioqg493mKZHKhrhbsapwyUpIc1NCkJFt2RZMcJMIlECJiHqAEmfv27TtKcWL48OEMHKfSfl+9VrWRe+/QoYNQRxi9p1xjqQpCnzVqGZiXjJh1sQNBBw4cOE3Gn5qayuFu3YrEZMBEQ/QOgRItGqMrURkaI6MnQ6e/4c2c3kV5ze3bt6kXtWzZ8g8YayeNva7MTQRfNOvycy5VrORjucqWu2XLll0IhIU9e/ZkY8eOrdZ6LTmBcePGCXd9+PDhfwNMpiZwJafnrrJCzR1T8kL1qdrIRe6SVK5evcpDQkKqLBEYrRhDvuGWREaPHi0yTrDfkrCwsPEY+xV6GHoDpbbsMuXVCteekl36g832Bq2+l5+fz9etWyc+XBUgcKNiDB6oQiBU8afchAgqgm8anvs1xttLtQqUG20tL2/XeIxF6qA/PQDKvoKkQi9etmyZoPcVAaHgR4tXgWiSUYHAiEVQJJar2dKRI0dESgwteBseHk7UvSN6a/RGSlJVYTnWpJSBKOIHgIY1TU5OPkZg6ANz5swRu+sKDAGlHVYlQouGF+RBQUEOGSL9JpAEnp5buHChyDIvXLjwDAncRAnCSBpuVVJMihcjfayDXQzes2fPTwTm2bNnfPbs2WLXXdEUowSKwGnSUIFoHrFr167iRIwkP3Xq1G0SQIS0jaDKSEMvFYt8kFQsEAsM2blzp6jbUG49f/58l9lgVTrsQbwXETwHpLM/xn6DTueTVLUMUM4oK1WoM+lIJb2oPnawORKsUxqYxYsXV+gA9CRw6NChTs+Q6h08eFAQ1tjY2L9hrLNUq1AltfWqarXRrHgxXxmIGkCXm+/atSud0k+ymSlTprgFYuDAgTwjI4NnZWXxFStWOKgZFelOnTol3hccHDxWgqAD1iak2koANJeXWJVXyLYrgbKIfoN65I8ZM2YCbOZfRCMoh3GVT2iNDoni4+PFleb279+fRUdHOzBq4luUSMEpWCRd0nqJXIPdKBC6C4TpwBRSdAXtfpqWlnaCCB2xU4rArhpRcUqTQ0NDWXZ29isQ01fEaiFJ9s033whgBIA6/c5DU4isTUcSeVXPR1QwpYr9FGHxIgUED2JJSUkiR9EKBVoNgPITqgNEREQwuF6WkJCwLT09/aeUlJQ1kZGRIWvWrBG1LAJAVUZqMTExA+fNm3dZ2cByKUlVKvMmxZOZwYXi9VVJqn9RNkclI/A0cSVWcOvWrbwNGzakwxZ+h2e70vXcuXP31GepyE1t5MiRPxiVfSr6P5OqgNEcgD0uLu77Fi1aNC8sLLQAhBXdTMdvVDuWhzjCQ23fvv0YEraLiibkQkLNIKFoPEtzqeBJdWMbPOG6nJycB9I+CuS1VHeS9UlA9G7ZS35EYwHeyjmGWTltsikAStjP/3xD4x+U+dp97XiuQDoY1dirfIboym404/dUoq16Tzs204y0SEmMNJ036epr2rqKFSnYKrINyyeA0Bs/UzNMXRGN69y4TZfhqdVDNVvVNsqum/9ZJaLuvLbIEl050ygeGS3K6Djarnt/xf/V8IleTF/GLI8+qMfO3IUTYQZZK6/I9Zo+k0tmOjUqD4j+qLmifwxw61j6/wIMALlVhcM6zgK2AAAAAElFTkSuQmCC),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/bh2.cur),auto!important
            }
          </style > `
        );
      } else {
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
            body.feature-whiteCursor input {cursor:url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACkAAAAtCAYAAAAz8ULgAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAyJpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMy1jMDExIDY2LjE0NTY2MSwgMjAxMi8wMi8wNi0xNDo1NjoyNyAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RSZWY9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZVJlZiMiIHhtcDpDcmVhdG9yVG9vbD0iQWRvYmUgUGhvdG9zaG9wIENTNiAoV2luZG93cykiIHhtcE1NOkluc3RhbmNlSUQ9InhtcC5paWQ6RkE0QzFBMjdCQzkyMTFFNzg4RDE5NkYzNkM0MDkwNzAiIHhtcE1NOkRvY3VtZW50SUQ9InhtcC5kaWQ6RkE0QzFBMjhCQzkyMTFFNzg4RDE5NkYzNkM0MDkwNzAiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDpGQTRDMUEyNUJDOTIxMUU3ODhEMTk2RjM2QzQwOTA3MCIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpGQTRDMUEyNkJDOTIxMUU3ODhEMTk2RjM2QzQwOTA3MCIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PnfOpO8AAAhdSURBVHjaxFlpTBVX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),url(https://raw.githubusercontent.com/louis2688/Accessibility-Widget/master/app/cursors/wh2.cur),auto!important
            }
          </style > `
        );
      } else {
        $('body').removeClass('feature-whiteCursor');
        $('.feature-whiteCursor').remove();
      }
    });

  $(document)
    .off('click touchstart', '#speech')
    .on('click touchstart', '#speech', function () {
      if (!$('.feature-speech-enable').length) {
        $('html').addClass('feature-speech-enable');
        speechEnable();
      } else {
        $('html').removeClass('feature-speech-enable');
        speechDisable();
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
      } else {
        $('html').removeClass('feature-tab-enable');
        removeTabIndex();
        questionArea.removeEventListener('focusin', highlightElement);
        let prevSelected = document.querySelector('[style*="-webkit-box-shadow"]');
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
      } else {
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
      } else {
        $('html').removeClass('feature-read-guide');
        isRunning = false;
        $('#pointer-ring').remove();
        $('#pointer-dot').remove();
      }
    });

  $(document)
    .off('click touchstart', '#clearFeature')
    .on('click touchstart', '#clearFeature', function () {
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
      };

      for (var feature in featureButtons) {
        if ($('body').hasClass(feature) || $('html').hasClass(feature)) {
          $(featureButtons[feature]).click();
        }
      }
    });
});
