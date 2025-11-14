import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={100}
          height={20}
          priority
        />
        <div className="flex flex-col items-center gap-8 text-center sm:items-start sm:text-left">
          <div>
            <h1 className="text-3xl font-semibold leading-10 tracking-tight text-black dark:text-zinc-50 mb-4">
              That Open Company POC
            </h1>
            <p className="max-w-2xl text-base leading-7 text-zinc-600 dark:text-zinc-400">
              Interactive proof of concept demonstrations using <span className="font-semibold">@thatopen/components</span> for advanced BIM visualization.
              Explore the power of Fragments - a modern, lightweight binary format optimized for high-performance 3D rendering and manipulation of large-scale building models.
            </p>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-2xl">
            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">3D World Viewer</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Uses Fragments</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Create and explore interactive 3D environments with camera controls, lighting adjustments, and performance monitoring.
              </p>
              <details className="mb-3">
                <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                  Features & Capabilities
                </summary>
                <ul className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4">
                  <li>• Interactive camera controls for immersive navigation</li>
                  <li>• Real-time lighting adjustments (directional & ambient)</li>
                  <li>• Performance monitoring with FPS and memory stats</li>
                  <li>• 3D grid helpers for spatial reference</li>
                  <li>• Mobile-responsive UI controls</li>
                </ul>
              </details>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-6 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                href="/world"
              >
                Launch 3D World
              </Link>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">2D Views Generator</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">Uses Fragments</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Automatically generate floor plans, elevations, and sections from IFC models. Essential for construction documentation.
              </p>
              <details className="mb-3">
                <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                  Features & Capabilities
                </summary>
                <ul className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4">
                  <li>• Automatic floor plans from IFC building storeys</li>
                  <li>• Elevation views (north, south, east, west)</li>
                  <li>• Custom sections via double-click on surfaces</li>
                  <li>• Interactive view management (open/remove)</li>
                  <li>• OrthoPerspectiveCamera for accurate 2D representation</li>
                </ul>
              </details>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-6 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                href="/views-2d"
              >
                Launch 2D Views
              </Link>
            </div>

            <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-5 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors">
              <div className="flex items-start justify-between mb-3">
                <h2 className="text-xl font-semibold text-black dark:text-zinc-50">IFC to Fragments Converter</h2>
                <span className="text-xs px-2 py-1 rounded-full bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300">Creates Fragments</span>
              </div>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                Convert IFC files to lightweight Fragments binary format for high-performance 3D rendering and manipulation.
              </p>
              <details className="mb-3">
                <summary className="text-xs font-medium text-zinc-500 dark:text-zinc-400 cursor-pointer hover:text-zinc-700 dark:hover:text-zinc-300">
                  Features & Capabilities
                </summary>
                <ul className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 space-y-1 pl-4">
                  <li>• Convert IFC files to optimized Fragments format</li>
                  <li>• Load and display door and window models</li>
                  <li>• Real-time 3D visualization on grid</li>
                  <li>• Simple one-click conversion process</li>
                  <li>• Memory-efficient binary format for large models</li>
                </ul>
              </details>
              <Link
                className="inline-flex h-10 items-center justify-center rounded-full bg-foreground px-6 text-sm text-background transition-colors hover:bg-[#383838] dark:hover:bg-[#ccc]"
                href="/ifc-converter"
              >
                Launch Converter
              </Link>
            </div>
          </div>

          <div className="border-t border-zinc-200 dark:border-zinc-800 pt-6 w-full max-w-2xl">
            <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">Why Fragments?</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Fragments represent the future of BIM visualization, offering 10-100x faster loading times compared to traditional formats.
              This modern binary format enables smooth interaction with massive building models in web browsers, opening possibilities for
              real-time collaboration, cloud-based BIM platforms, and accessible project visualization across devices.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-4 text-base font-medium sm:flex-row">
          <a
            className="flex h-12 w-full items-center justify-center rounded-full border border-solid border-black/[.08] px-5 transition-colors hover:border-transparent hover:bg-black/[.04] dark:border-white/[.145] dark:hover:bg-[#1a1a1a] md:w-[200px]"
            href="https://docs.thatopen.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            Documentation
          </a>
        </div>
      </main>
    </div>
  );
}
