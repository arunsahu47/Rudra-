import { useEffect, useRef } from 'react';

export default function AdBanner() {
  const bannerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!bannerRef.current || bannerRef.current.hasChildNodes()) return;

    // We define the atOptions globally so the script can read it
    window.atOptions = {
      'key' : 'bae4cc08c20c3f9aa8879af9bdcd5a44',
      'format' : 'iframe',
      'height' : 90,
      'width' : 728,
      'params' : {}
    };

    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = "https://www.highperformanceformat.com/bae4cc08c20c3f9aa8879af9bdcd5a44/invoke.js";
    invokeScript.async = true;

    bannerRef.current.appendChild(invokeScript);
  }, []);

  return (
    <div className="w-full flex justify-center items-center my-4 z-50">
      <div 
        ref={bannerRef} 
        className="w-[728px] h-[90px] overflow-hidden flex justify-center max-w-[100vw]"
      />
    </div>
  );
}
