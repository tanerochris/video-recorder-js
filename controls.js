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