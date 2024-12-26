import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { twMerge } from 'tailwind-merge';

interface AudioSettingsProps {
  isVisible: boolean;
}

interface MediaDeviceInfo {
  deviceId: string;
  kind: string;
  label: string;
}

const AudioSettings = ({ isVisible }: AudioSettingsProps) => {
  const [inputDevices, setInputDevices] = useState<MediaDeviceInfo[]>([]);
  const [outputDevices, setOutputDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string | null>(null);
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string | null>(null);
  const [permission, setPermission] = useState<PermissionState>();

  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        const micPermission = await navigator.permissions.query({
          name: 'microphone' as PermissionName,
        });
        setPermission(micPermission.state as PermissionState);

        micPermission.onchange = () => {
          setPermission(micPermission.state as PermissionState);
        };
      } catch (error) {
        console.error('Error checking microphone permission', error);
      }
    };

    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    if (permission === 'granted') {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const inputs = devices.filter(device => device.kind === 'audioinput');
        const outputs = devices.filter(device => device.kind === 'audiooutput');
        setInputDevices(inputs);
        setOutputDevices(outputs);

        if (inputs.length > 0) {
          setSelectedInputDevice(inputs[0].deviceId);
        }
        if (outputs.length > 0) {
          setSelectedOutputDevice(outputs[0].deviceId);
        }
      });
    }
  }, [permission]);

  const handleInputChange = async (deviceId: string) => {
    setSelectedInputDevice(deviceId);

    try {
    } catch (error) {
      console.error('Error accessing audio input:', error);
    }
  };

  const handleOutputChange = async (deviceId: string) => {
    setSelectedOutputDevice(deviceId);

    try {
      const audioElement = document.querySelector('audio');
      if (audioElement && typeof audioElement.setSinkId === 'function') {
        await audioElement.setSinkId(deviceId);
      }
    } catch (error) {
      console.error('Error setting audio output:', error);
    }
  };

  if (permission !== 'granted') return null;

  return (
    <div className={twMerge('fixed z-20 p-4 border border-border rounded-lg mb-2 -left-80 bottom-24 invisible transition-all duration-500 bg-background', isVisible && 'visible opacity-1 left-0')}>
      <div className="p-2 space-y-4 w-full">
        <h2 className="text-base font-semibold">Select Audio Input</h2>
        <Select onValueChange={handleInputChange} value={selectedInputDevice || ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select input device">{inputDevices.find(device => device.deviceId === selectedInputDevice)?.label || 'Select input device'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {inputDevices.map(device => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Microphone ${device.deviceId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <h2 className="text-base font-semibold">Select Audio Output</h2>
        <Select onValueChange={handleOutputChange} value={selectedOutputDevice || ''}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select output device">{outputDevices.find(device => device.deviceId === selectedOutputDevice)?.label || 'Select output device'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {outputDevices.map(device => (
              <SelectItem key={device.deviceId} value={device.deviceId}>
                {device.label || `Speaker ${device.deviceId}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <audio controls autoPlay style={{ display: 'none' }}></audio>
      </div>
    </div>
  );
};

export default AudioSettings;
