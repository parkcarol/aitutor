import Image from "next/image";

export default function Home() {
  return (

    <div className="bg-white">

      <div className="flex h-screen w-screen">
        <div className="w-screen m-10 flex items-center justify-center rounder-x1 shadow-md">
          <p className="text-black text-xl">Left Side</p>
        </div>
        <div className="w-screen m-10 flex items-center justify-center rounder-x1 shadow-md">
          <p className="text-black text-xl">Right Side</p>
        </div>
      </div>

    </div>

  );
}
