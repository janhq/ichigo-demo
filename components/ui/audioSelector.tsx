import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';

// TypeScript interface for Media Device Info
interface MediaDeviceInfo {
  deviceId: string;
  kind: string;
  label: string;
}

const AudioSelector = () => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(null);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(null);

  useEffect(() => {
    // Fetch audio devices when component mounts
    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs = devices.filter((device) => device.kind === 'audioinput');
      const outputs = devices.filter((device) => device.kind === 'audiooutput');
      setInputDevices(inputs);
      setOutputDevices(outputs);

      // Set a default input device, e.g., the first available device
      if (inputs.length > 0) {
        setSelectedInputDevice(inputs[0].deviceId);
      }
      if (outputs.length > 0) {
        setSelectedOutputDevice(outputs[0].deviceId);
      }
    });
  }, []);

  const handleInputChange = async (deviceId: string) => {
    setSelectedInputDevice(deviceId);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
    } catch (error) {
      console.error('Error accessing audio input:', error);
    }
  };

  const handleOutputChange = async (deviceId: string) => {
    setSelectedOutputDevice(deviceId);

    try {
      // Set the audio output device immediately
      const audioElement = document.querySelector('audio');
      if (audioElement && typeof audioElement.setSinkId === 'function') {
        await audioElement.setSinkId(deviceId);
      }
    } catch (error) {
      console.error('Error setting audio output:', error);
    }
  };

  return (
    <div className="p-2 space-y-4 w-full">
      <h2 className="text-base font-semibold">Select Audio Input</h2>
      <Select onValueChange={handleInputChange} value={selectedInputDevice || ''}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select input device">{inputDevices.find((device) => device.deviceId === selectedInputDevice)?.label || 'Select input device'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {inputDevices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `Microphone ${device.deviceId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <h2 className="text-base font-semibold">Select Audio Output</h2>
      <Select onValueChange={handleOutputChange} value={selectedOutputDevice || ''}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select output device">{outputDevices.find((device) => device.deviceId === selectedOutputDevice)?.label || 'Select output device'}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {outputDevices.map((device) => (
            <SelectItem key={device.deviceId} value={device.deviceId}>
              {device.label || `Speaker ${device.deviceId}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <audio controls autoPlay style={{ display: 'none' }}></audio>
    </div>
  );
};

export default AudioSelector;
