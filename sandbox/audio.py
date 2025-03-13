import tkinter as tk
import math
import numpy as np
import pyaudio
import matplotlib.pyplot as plt
import threading
from matplotlib.backends.backend_tkagg import FigureCanvasTkAgg

def fib(x):
    answer = 1 
    sequence = [1, 1, 2, 3, 5, 8]
    gen_seq = [1, 1]
    if x < len(sequence):
        return sequence[x]
    for n in range(x+1):
        if n > 1:
            gen_seq.append(gen_seq[n-1] + gen_seq[n-2])
    return(gen_seq[x])


def generate_equal_temperament_table(reference_pitch=440.0, octave_divisions=12):
    """
    Generates a tuning table for equal temperament.

    Args:
        reference_pitch: The frequency of the reference pitch (e.g., A4 = 440 Hz).
        octave_divisions: The number of equal divisions in the octave (usually 12 for Western music).

    Returns:
        A dictionary where keys are semitone steps from the reference pitch
        and values are the corresponding frequencies.
    """

    tuning_table = {}
    a = 2**-(1/octave_divisions)  # The ratio between adjacent semitones

    for n in range(octave_divisions):
        frequency = reference_pitch * (a)**n
        tuning_table[n] = frequency
    return tuning_table


# Example of how to get frequencies for other octaves:
# To get the octave below, divide by 2. To get the octave above, multiply by 2.

          

class TonePlayer:
    def __init__(self, root):
        self.root = root
        self.root.title("Pure Tone Player")
        self.sample_rate = 48000
        self.amplitude = 0.5
#        self.frequencies = {
#            'q': 261.63, 'w': 277.18, 'e': 293.66, 'r': 311.13, 't': 329.63,
#            'y': 349.23, 'u': 369.99, 'i': 392.00, 'o': 415.30, 'p': 440.00,
#            '[': 466.16, ']': 493.88, 'a': 523.25, 's': 554.37, 'd': 587.33,
#            'f': 622.25, 'g': 659.25, 'h': 698.46, 'j': 739.99, 'k': 783.99,
#            'l': 830.61, ';': 880.00, "'": 932.33, 'z': 987.77, 'x': 1046.50
#        }
        a = 2 ** (1/12)
        tonal_a = 440
        # formula : f_n = f_ref * (a)^n
        octave_below = tonal_a * a ** -12
        octave_lower = octave_below * a ** -12
        octave_lower_lower = 55
        octave_lower_lower_lower = 27.5
        # Generate the tuning table
        # Print the table
        equal_temperament_table = generate_equal_temperament_table()

        self.frequencies = {
            '1': (math.e ** 3), '2': (math.e ** 4), '3': (math.e ** 5), '4': (math.e * 8), '5': (math.e * 9),
            '6': (math.e * 10), '7': (math.e * 11), '8': (math.e * 12), '9': (math.e * 13), '0': (math.e * 14),
            'y': equal_temperament_table[0], 'u': equal_temperament_table[1], 'i': equal_temperament_table[2], 'o': equal_temperament_table[3], 'p': equal_temperament_table[4],
            '[': 466.16, ']': 493.88, 'a': 523.25, 's': 554.37, 'd': 587.33,
            'f': (math.e * 15), 'g': (math.e * 16), 'h': (math.e * 17), 'j': (math.e * 18), 'k': (math.e * 19),
            'l': fib(8), ';': fib(9), "'": fib(10), 'z': fib(11), 'x':fib(12), 
            'c': fib(13), 'v': fib(14), "b": fib(15), 'n': fib(16), 'm':fib(17) 
        }
        # favorite tones so far: math.e ** 4, math.e * 17
        self.duration = 5.0
        self.fade_duration = 0.1
        self.max_tones = 10  # Limit to 10 simultaneous tones
        
        self.p = pyaudio.PyAudio()
        self.stream = self.p.open(format=pyaudio.paFloat32,
                                 channels=1,
                                 rate=self.sample_rate,
                                 output=True,
                                 frames_per_buffer=4096,
                                 stream_callback=self.audio_callback)
        self.stream.start_stream()
        
        self.active_waveforms = []
        self.lock = threading.Lock()
        
        self.setup_gui()
        self.root.bind('<KeyPress>', self.key_press)
        self.update_audio()

    def setup_gui(self):
        self.fig, self.ax = plt.subplots()
        self.canvas = FigureCanvasTkAgg(self.fig, master=self.root)
        self.canvas.get_tk_widget().pack()
        tk.Label(self.root, text="Press QWERTY/ASDFG/HJKL/ZX etc. to stack tones\nUp/Down for amplitude").pack()

    def play_tone(self, frequency):
        print(f"playing freq: {frequency}")
        total_samples = int(self.duration * self.sample_rate)
        t = np.arange(total_samples) / self.sample_rate
        waveform = self.amplitude * np.sin(2 * np.pi * frequency * t)
        
        fade_samples = int(self.fade_duration * self.sample_rate)
        fade_in = np.linspace(0, 1, fade_samples)
        fade_out = np.linspace(1, 0, fade_samples)
        waveform[:fade_samples] *= fade_in
        waveform[-fade_samples:] *= fade_out
        
        with self.lock:
            if len(self.active_waveforms) < self.max_tones:
                self.active_waveforms.append([waveform, total_samples])
                print(f"Added tone: {frequency} Hz, {total_samples} samples")
            else:
                print(f"Max tones ({self.max_tones}) reached, ignoring {frequency} Hz")

    def audio_callback(self, in_data, frame_count, time_info, status):
        data = np.zeros(frame_count, dtype=np.float32)
        
        try:
            with self.lock:
                to_remove = []
                for i, (waveform, samples_remaining) in enumerate(self.active_waveforms):
                    if samples_remaining <= 0:
                        to_remove.append(i)
                        continue
                    
                    start_idx = len(waveform) - samples_remaining
                    end_idx = min(start_idx + frame_count, len(waveform))
                    chunk_size = end_idx - start_idx
                    if chunk_size > 0:
                        data[:chunk_size] += waveform[start_idx:end_idx]
                    self.active_waveforms[i][1] -= frame_count
                
                for i in sorted(to_remove, reverse=True):
                    self.active_waveforms.pop(i)
                    print(f"Tone finished - Active tones: {len(self.active_waveforms)}")
        except Exception as e:
            print(f"Callback error: {e}")
            return (data.tobytes(), pyaudio.paAbort)  # Abort on error to avoid segfault
        
        data = np.clip(data / max(1, len(self.active_waveforms)), -1, 1)
        return (data.tobytes(), pyaudio.paContinue)

    def update_audio(self):
        with self.lock:
            if self.active_waveforms:
                combined = np.zeros(int(self.duration * self.sample_rate), dtype=np.float32)
                for waveform, samples_remaining in self.active_waveforms:
                    start_idx = len(waveform) - samples_remaining
                    if start_idx < len(waveform):
                        valid_length = min(len(combined), len(waveform) - start_idx)
                        combined[:valid_length] += waveform[start_idx:start_idx + valid_length]
                combined = np.clip(combined / max(1, len(self.active_waveforms)), -1, 1)
                
                self.ax.clear()
                self.ax.plot(combined[:10000])
                self.ax.set_ylim(-1, 1)
                self.canvas.draw()
        
        self.root.after(50, self.update_audio)

    def key_press(self, event):
        key = event.keysym.lower()
        if key in self.frequencies:
            self.play_tone(self.frequencies[key])  # Synchronous call
        elif key == 'up':
            self.amplitude = min(1.0, self.amplitude + 0.1)
        elif key == 'down':
            self.amplitude = max(0.1, self.amplitude - 0.1)

    def on_closing(self):
        self.stream.stop_stream()
        self.stream.close()
        self.p.terminate()
        self.root.destroy()

if __name__ == "__main__":
    root = tk.Tk()
    app = TonePlayer(root)
    root.protocol("WM_DELETE_WINDOW", app.on_closing)
    root.mainloop()
