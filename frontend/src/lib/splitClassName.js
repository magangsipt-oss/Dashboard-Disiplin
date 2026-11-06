// Pisahkan kelas tata letak (lebar, margin, posisi di flex/grid) untuk pembungkus
// dari kelas tampilan (border, warna, padding) untuk elemen di dalamnya.
const LAYOUT_CLASS =
  /^(?:[a-z0-9-]+:)*(?:w-|min-w-|max-w-|m-|mx-|my-|mt-|mb-|ml-|mr-|flex-1|flex-none|flex-auto|shrink|grow|basis-|col-span|row-span|self-|order-|justify-self-)/;

export function splitClassName(className = "") {
  const layout = [];
  const visual = [];
  className
    .split(/\s+/)
    .filter(Boolean)
    .forEach((item) => {
      (LAYOUT_CLASS.test(item) ? layout : visual).push(item);
    });
  return { layout: layout.join(" "), visual: visual.join(" ") };
}
