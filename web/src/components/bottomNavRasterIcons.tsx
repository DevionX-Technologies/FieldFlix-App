import flickshortsNavSrc from '../assets/Flickshorts.png'
import recordingsNavSrc from '../assets/Recordings.png'

/** Shared raster assets for bottom nav — keep in sync across Home, Sessions, Recordings, etc. */
export const FLICKSHORTS_NAV_SRC = flickshortsNavSrc
export const RECORDINGS_NAV_SRC = recordingsNavSrc

const navImgClass = 'h-7 w-7 object-contain object-center'

export function BottomNavFlickShortsIcon() {
  return <img src={flickshortsNavSrc} alt="" className={navImgClass} draggable={false} />
}

export function BottomNavRecordingsIcon() {
  return <img src={recordingsNavSrc} alt="" className={navImgClass} draggable={false} />
}
