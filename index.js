// constraints configures and controls media devices used by recorder
const contraints = {
    audio: false, // enable or disable audio capture
    video: {
        width: { ideal: 1280 },
        height: { ideal: 720 }
    }
}
let videoRecorder = null // video recorder
let videoChunks = [] // capture chunks of recorded video bytes
let isRecording = false // tracks recording status
let isPlaying = false // tracks if video being played
let recordInterval = null // record timer interval 
let playInterval = null // play timer interval
let sliderHandleEventThrottlePause // stop handling input change when value is true
// check if player control should be function/ on record player control is disabled
let canPlay = false 
let imageCapture = null // variable to gold imageTrack object
const THROTTLE_TIME = 100 // do not handle input until after throttle period in ms

/**
 * Control functions and helpers
 */
// start recording video
const startRecord = async () => {
    videoRecorder.start()
}
// throttle on slider input
const throttleSlider = (handler, event, pauseTime) => {
    if (sliderHandleEventThrottlePause) return;
    sliderHandleEventThrottlePause = true;
    setTimeout(() => {
        handler(event);
        sliderHandleEventThrottlePause = false;
    }, pauseTime);
}
// handle errors when there is failure in capturing media input's data
const handleMediaErrors = (e) => {
    switch(e.name) {
        case "NotFoundError":
          alert("No camera and/or microphone" +
                "were found.");
          break;
        case "SecurityError":
        case "PermissionDeniedError":
            alert("You need to allow camera and or microphone to use program" + e.message);
            break;
        default:
          alert("Error opening your camera and/or microphone: " + e.message);
          break;
      }
}
// shows or hide a play control overlayed on the video when recording is complete
// clicking on this overlay starts the video
const showVideoOverLay = (overlay = true) => {
    const videoOverLay = document.getElementById('ix-video-overlay')
    if (overlay)
        videoOverLay.classList.remove('ix-hidden')
    else videoOverLay.classList.add('ix-hidden')
}
// toggle the display of the start and stop record buttons
const toggleRecord = () => {
    const stopRecordBtn = document.getElementById('ix-stop-record')
    const startRecordBtn = document.getElementById('ix-start-record')
    if (isRecording) {
        startRecordBtn.classList.add('ix-hidden')
        stopRecordBtn.classList.remove('ix-hidden')
    } else {
        stopRecordBtn.classList.add('ix-hidden')
        startRecordBtn.classList.remove('ix-hidden')
        showVideoOverLay()
    }
}
// outputs captured camera data to the video output
const displayVideo = (stream, play = false) => {
    // attach stream to object
    const video = document.querySelector('video')
    video.src = URL.createObjectURL(stream)
    video.onloadedmetadata = () => {
        if (play)
            video.play()
    }
}
// play video
const playVideo = (pause = false) => {
    const video = document.querySelector('video')
    if (pause)
        video.pause()
    else video.play()
}
// captures camera and audio
const captureVideo = async (contraints) => {
    let stream = null
    try {
        stream = await navigator.mediaDevices.getUserMedia(contraints)
        videoRecorder = new MediaRecorder(stream)
        try {
            displayVideo(stream, true)
            registerRecordListeners(videoRecorder)
            const track = stream.getVideoTracks()[0]
            imageCapture = new ImageCapture(track)
        } catch (e) {
            console.log(e)
        }
        
    } catch (err) {
        /**handle the error */
        handleMediaErrors(err)
    }
}
// show timer as video/audio is being recorded
const timerRecord = async () => {
    let seconds = 0
    const outNode = document.querySelectorAll('.slider-output')
    const out1 = outNode[0]
    const out2 = outNode[1]
    out1.textContent = '00:00'
    out2.textContent = '-:-'
    recordInterval = setInterval(() => {
        out1.textContent = formatTimerOutput(++seconds)
    }, 1000)
}
// show timers as video/audio is being played
const playTimer = async () => {
    const outNode = document.querySelectorAll('.slider-output')
    const sliderInput = document.getElementById('ix-slider-handle')
    const videoDisplay = document.getElementById('video-output')
    const playBtn = document.getElementById('playBtn')
    const pauseBtn = document.getElementById('pauseBtn')
    const out1 = outNode[0]
    sliderInput.value = Number(sliderInput.value) == 0 ? 0 : videoDisplay.currentTime
    isPlaying = true
    playInterval = setInterval(() => {
        if (Number(sliderInput.max) <= videoDisplay.currentTime) {
            isPlaying = false
            out1.textContent = formatTimerOutput(sliderInput.max)
            sliderInput.value = sliderInput.max
            clearInterval(playInterval)
            playBtn.classList.remove('ix-hidden')
            pauseBtn.classList.add('ix-hidden')
        } else {
            sliderInput.value = videoDisplay.currentTime
            out1.textContent = formatTimerOutput(Math.floor(videoDisplay.currentTime))
        }
    }, 1000)
}
// stop timer when recording is stopped
const stopRecordTimer = () => {
    clearInterval(recordInterval)
}
// convert seconds to hh:mm:ss for timer display
const formatTimerOutput = (seconds) => {
    let secs = Number(seconds)
    if (!secs) {
        return '00:00'
    }
    if (secs < 60) {
        return `00:${secs.toString().padStart(2, '0')}`
    }
    let mins = Math.floor(secs / 60)
    if (mins < 60) {
        const secLeft = secs % 60
        return `${mins.toString().padStart(2, '0')}:${secLeft.toString().padStart(2, '0')}`
    }
    let hrs = Math.floor(secs / (60*60))
    let minSecLeft = secs % (60*60)
    mins = Math.floor(minSecLeft / 60)
  	const secLeft = minSecLeft % 60
    secs = secLeft % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}
// get the duration of recorded media (video)
const getBlobDuration = async (blob) => {
    const tempVideoEl = document.createElement('video')
    const durationP = new Promise((resolve, reject) => {
      tempVideoEl.addEventListener('loadedmetadata', () => {
        // Chrome bug: https://bugs.chromium.org/p/chromium/issues/detail?id=642012
        if(tempVideoEl.duration === Infinity) {
          tempVideoEl.currentTime = Number.MAX_SAFE_INTEGER
          tempVideoEl.ontimeupdate = () => {
            tempVideoEl.ontimeupdate = null
            resolve(tempVideoEl.duration)
            tempVideoEl.currentTime = 0
          }
        }
        // Normal behavior
        else
          resolve(tempVideoEl.duration)
      })
      tempVideoEl.onerror = (event) => reject(event.target.error)
    })
  
    tempVideoEl.src = typeof blob === 'string' || blob instanceof String
      ? blob
      : window.URL.createObjectURL(blob)
  
    return durationP
}
/**
 * Event handlers
 */
// handler when video capture starts producing data
const onDataAvailableHandler = (evt) => {
    videoChunks.push(evt.data)
}
// handler when recording has started
const onRecordStartHandler = (evt) => {
    isRecording = true
    toggleRecord()
    timerRecord()
}
// handler when recording is stopped
const onRecordStopHandler = async (evt) => {
    const blob = new Blob(videoChunks, { 'type' : 'video/webm; codecs=av1' });
    const outNode = document.querySelectorAll('.slider-output')
    const sliderInput = document.getElementById('ix-slider-handle')
    videoChunks = []
    displayVideo(blob)
    unregisterRecordListeners(videoRecorder)
    isRecording = false
    toggleRecord()
    stopRecordTimer()
    const out1 = outNode[0]
    const out2 = outNode[1]
    out1.textContent = '00:00'
    const seconds = await getBlobDuration(blob)
    out2.textContent = formatTimerOutput(Math.floor(seconds))
    sliderInput.max = Math.floor(seconds)
    canPlay = true
}
// handler on video play
const onHandleVideoPlay = (e) => {
    if (!canPlay) {
        e.preventDefault()
        return
    }
    showVideoOverLay(false)
    playVideo()
    playTimer()
    const playBtn = document.getElementById('playBtn')
    const pauseBtn = document.getElementById('pauseBtn')
    playBtn.classList.add('ix-hidden')
    pauseBtn.classList.remove('ix-hidden')
}
// handler on video pause
const onHandleVideoPause = () => {
    const playBtn = document.getElementById('playBtn')
    const pauseBtn = document.getElementById('pauseBtn')
    const videoDisplay = document.getElementById('video-output')
    playBtn.classList.remove('ix-hidden')
    pauseBtn.classList.add('ix-hidden')
    isPlaying = false
    clearInterval(playInterval)
    videoDisplay.pause()
}
// handler on slider input change
const onSliderChange = (evt) => {
    const videoDisplay = document.getElementById('video-output')
    const input = evt.target
    videoDisplay.currentTime = input.value
    const outNode = document.querySelectorAll('.slider-output')
    const out1 = outNode[0]
    out1.textContent = formatTimerOutput(Math.floor(videoDisplay.currentTime))
}
// handler on image capture
const onSnapHandler =  async (evt) => {
    console.log('photo capture clicked')
    const imageBlob = await imageCapture.takePhoto()
    const imageSrc = URL.createObjectURL(imageBlob)
    const imageCont = document.getElementById('ix-image-cont')
    imageCont.classList.remove('ix-hidden')
    const image = document.getElementById('ix-image')
    image.src = imageSrc
}
// register event listeners
const registerEventListners = () => {
    const  startRecordBtn = document.getElementById('startRecordBtn')
    const  stopRecordBtn = document.getElementById('stopRecordBtn')
    const  captureRecordBtn = document.getElementById('captureRecordBtn')
    const  restartRecordBtn = document.getElementById('restartRecordBtn')
    const  playBtnOverlay = document.getElementById("playBtnOverlay")
    const  sliderInput = document.getElementById("ix-slider-handle")
    const  playBtn = document.getElementById("playBtn")
    const  pauseBtn = document.getElementById("pauseBtn")

    startRecordBtn.addEventListener('click', () => {
        videoRecorder.start()
    })
    stopRecordBtn.addEventListener('click', () => {
        videoRecorder.stop()
        restartRecordBtn.classList.remove('ix-hidden')
    })
    restartRecordBtn.addEventListener('click', (evt) => {
        if (isRecording) {
            evt.preventDefault()
            return
        }
        playBtn.classList.remove('ix-hidden')
        pauseBtn.classList.add('ix-hidden')
        isRecording = false
        isPlaying = false
        canPlay = false
        stopRecordTimer()
        sliderInput.value = 0
        setTimeout(() => {
            showVideoOverLay(false)
            const outNode = document.querySelectorAll('.slider-output')
            outNode[0].textContent = '-:-'
            outNode[1].textContent = '-:-'
        }, 500)
        captureVideo(contraints)
        restartRecordBtn.classList.add('ix-hidden')
    })
    playBtn.addEventListener('click', onHandleVideoPlay)
    playBtnOverlay.addEventListener("click", onHandleVideoPlay)
    sliderInput.addEventListener("input", onMoveSliderHandler)
    pauseBtn.addEventListener("click", onHandleVideoPause)
    captureRecordBtn.addEventListener('click', onSnapHandler)
}
// register record listeners
const registerRecordListeners = (recorder) => {
    recorder.addEventListener('dataavailable', onDataAvailableHandler)
    recorder.addEventListener('start', onRecordStartHandler)
    recorder.addEventListener('stop', onRecordStopHandler)
}
// unregister record listeners
const unregisterRecordListeners = (recorder) => {
    recorder.removeEventListener('dataavailable', onDataAvailableHandler)
    recorder.removeEventListener('start', onRecordStartHandler)
    recorder.removeEventListener('stop', onRecordStopHandler)
}
const onMoveSliderHandler = evt => {
    throttleSlider(onSliderChange, evt, THROTTLE_TIME)
}
/**
 * Run video recorder
 */
// start capturing camera inputs
captureVideo(contraints)
// add event listeners to different controls
registerEventListners()