// Singleton audio element for seeking from anywhere
let audioElement: HTMLAudioElement | null = null;

export function registerAudioElement(el: HTMLAudioElement) {
  audioElement = el;
}

export function useAudioSeek() {
  const seek = (time: number) => {
    if (audioElement) {
      audioElement.currentTime = time;
    }
  };
  return { seek };
}
