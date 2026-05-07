import React, { useEffect, useRef } from "react";
import jazzicon from "@metamask/jazzicon";

interface JazziconProps {
  address: string;
  diameter?: number;
}

const Jazzicon: React.FC<JazziconProps> = ({ address, diameter = 40 }) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!address || !ref.current) return;

    ref.current.innerHTML = "";

    const seed = parseInt(address.slice(2, 10), 16);
    const icon = jazzicon(diameter, seed);
    ref.current.appendChild(icon);
  }, [address, diameter]);

  return <div ref={ref} style={{ width: diameter, height: diameter }} />;
};

export default Jazzicon;
