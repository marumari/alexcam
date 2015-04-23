/*global $, jQuery, console, LocalMediaStream, MediaStreamRecorder */
var mirror = {};

function playbackVideo(stream) {
	'use strict';
	var video;
	video = document.querySelector('video');
	
	if (stream instanceof LocalMediaStream) {
		video.src = window.URL.createObjectURL(stream); // initial page playback
	} else {
		video.src = mirror.recorded_videos[0]; // the unending stream of delayed videos
		video.onended = function () {
            if (mirror.delayed === true) {
                playbackVideo(true);
            }
        };
	}
}

function recordVideo(stream) {
	'use strict';
	mirror.recorder = new MediaStreamRecorder(stream); // eventually move this into the app itself
	mirror.recorder.mimeType = 'video/webm';
	mirror.recorder.ondataavailable = function (blob) {
		mirror.recorded_videos.push(window.URL.createObjectURL(blob));
		if (mirror.recorded_videos.length > 2) {
			window.URL.revokeObjectURL(mirror.recorded_videos[0]);
			mirror.recorded_videos.shift();
		}
	};
	mirror.recorder.start(mirror.delay * 500);
}

function delayedStream(stream) {
    'use strict';
    if (mirror.recorded_videos < 2) {
        $("#delay").button("option", "label", "Buffering...");
        setTimeout(delayedStream, 100);
        return (false);
    }
    
    // In case it was set to Buffering..., or it's delayed
    $("#delay").button("option", "label", "Resume Normal Playback");
    
    playbackVideo(true);
}

function startVideoStream() {
	'use strict';
	
	// Attempt to get ahold of the media extension (webrtc)
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia;
	
	navigator.getUserMedia({audio: false, video: true}, function (stream) {
		mirror.stream = stream;
		playbackVideo(stream);
        recordVideo(stream);
	}, function () {
		document.querySelector('body').innerHTML = "<p>sorry, no media support</p>";
	});
}

$(document).ready(function () {
	'use strict';
	var i;
	mirror.delayed = false; // set the mirror as not being delayed
	mirror.defaultdelay = 5;
	mirror.delay = mirror.defaultdelay;
	mirror.recorded_videos = [];

	$("#delay").button().on("click", function () {
		if (mirror.delayed === true) {
			mirror.delayed = false;
            $("#delay").button("option", "label", "Delay Playback " + mirror.delay + " Seconds");
			playbackVideo(mirror.stream);
		} else {
			mirror.delayed = true;
			delayedStream(mirror.stream);
		}
	});

	$("#seconds").slider({
		min: 1,
		max: 30,
		value: mirror.defaultdelay,
		create: function () {
			mirror.delay = $("#seconds").slider("option", "value");
			$("#delay").button("option", "label", "Delay Playback " + mirror.delay + " Seconds");
		},
		change: function () {
			mirror.delay = $("#seconds").slider("option", "value");
			$("#delay").button("option", "label", "Delay Playback " + mirror.delay + " Seconds");
            
            // Jump to normal playback, stop the recorder, delete all previously recorded videos, and then start buffering again
            playbackVideo(mirror.stream);
            mirror.recorder.stop();
            for (i = 0; i < mirror.recorded_videos.length; i += 1) {
                window.URL.revokeObjectURL(mirror.recorded_videos[i]);
            }
            mirror.recorded_videos = [];
            recordVideo(mirror.stream);
		}
	});

	// load the default video stream on and request permissions, on page load
	startVideoStream();
});

