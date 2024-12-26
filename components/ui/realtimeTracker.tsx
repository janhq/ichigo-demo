'use client';

import { formatCompactNumber } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { FaCircleExclamation } from 'react-icons/fa6';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const RealtimeTracker: React.FC = () => {
  const [userCount, setUserCount] = useState<number>(0);

  useEffect(() => {
    const eventSource = new EventSource('/api/sse');

    eventSource.onmessage = event => {
      setUserCount(Number(event.data)); // Update the user count
    };

    return () => {
      eventSource.close(); // Close the connection when the component unmounts
    };
  }, []);

  const isShowInfo = userCount > 3;

  return (
    <div className="text-center">
      <p className="font-medium my-1">Hosted on a single 3090🔥</p>
      <div className="flex items-center justify-center gap-2">
        <div className="flex items-center gap-1 border border-border px-2 py-1 rounded-md">
          <TooltipProvider delayDuration={0}>
            {isShowInfo && (
              <Tooltip>
                <TooltipTrigger>
                  <FaCircleExclamation className="text-red-400" />
                </TooltipTrigger>
                <TooltipContent className="max-w-80 py-2" sideOffset={16}>
                  <p className="text-sm text-left">With more than 3 concurrent users, you may experience increased latency, as this demo runs on a single 3090 GPU</p>
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
          <h1>{formatCompactNumber(userCount)} Users Online</h1>
        </div>
      </div>
    </div>
  );
};

export default RealtimeTracker;
