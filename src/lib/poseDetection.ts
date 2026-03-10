/**
 * Pose Detection Module — MediaPipe Pose Integration
 *
 * This module initialises MediaPipe Pose and provides functions
 * to start/stop pose detection on a video element.
 *
 * MediaPipe Pose detects 33 body landmarks in real time:
 *   - Face (0–10)
 *   - Upper body: shoulders (11,12), elbows (13,14), wrists (15,16)
 *   - Torso: hips (23,24)
 *   - Lower body: knees (25,26), ankles (27,28)
 *   - Feet (29–32)
 *
 * We use modelComplexity=1 for a balance of speed and accuracy.
 */

import { Pose, Results, NormalizedLandmarkList } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';

export type OnResultsCallback = (landmarks: NormalizedLandmarkList) => void;

let pose: Pose | null = null;
let camera: Camera | null = null;

/**
 * Initialise and start pose detection.
 *
 * @param videoElement The <video> element to stream the camera into
 * @param onResults    Callback fired each frame with the 33 pose landmarks
 */
export async function startPoseDetection(
    videoElement: HTMLVideoElement,
    onResults: OnResultsCallback
): Promise<void> {
    // Create the MediaPipe Pose instance
    pose = new Pose({
        locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`,
    });

    // Configure pose detection parameters
    pose.setOptions({
        modelComplexity: 1,         // 0=lite, 1=full, 2=heavy
        smoothLandmarks: true,       // Built-in temporal smoothing
        enableSegmentation: false,   // We don't need body segmentation
        minDetectionConfidence: 0.6, // Minimum confidence to detect a pose
        minTrackingConfidence: 0.5,  // Minimum confidence to track between frames
    });

    // Set up the results callback
    pose.onResults((results: Results) => {
        if (results.poseLandmarks) {
            onResults(results.poseLandmarks);
        }
    });

    // Use MediaPipe's Camera utility to stream frames to the Pose model
    camera = new Camera(videoElement, {
        onFrame: async () => {
            if (pose) {
                await pose.send({ image: videoElement });
            }
        },
        width: 1280,
        height: 720,
    });

    await camera.start();
}

/**
 * Stop pose detection and release resources.
 */
export function stopPoseDetection(): void {
    if (camera) {
        camera.stop();
        camera = null;
    }
    if (pose) {
        pose.close();
        pose = null;
    }
}
