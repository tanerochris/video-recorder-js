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
const onMoveSliderHandler = evt => {
    throttleSlider(onSliderChange, evt, THROTTLE_TIME)
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
