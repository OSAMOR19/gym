/**
 * Camera facing — one shared front/back preference for every camera screen.
 *
 * 'user' (front, mirrored selfie view) is the default; 'environment' asks for
 * the back camera with an `ideal` constraint so devices with a single camera
 * (laptops) silently keep whatever they have instead of erroring.
 */

export type CameraFacing = 'user' | 'environment';

const KEY = 'irontrack_camera_facing';

export function getStoredFacing(): CameraFacing {
    try {
        return localStorage.getItem(KEY) === 'environment' ? 'environment' : 'user';
    } catch {
        return 'user';
    }
}

export function storeFacing(facing: CameraFacing): void {
    try { localStorage.setItem(KEY, facing); } catch { /* private mode */ }
}

export function cameraConstraints(facing: CameraFacing): MediaStreamConstraints {
    return {
        video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: facing === 'environment' ? { ideal: 'environment' } : 'user',
        },
    };
}
