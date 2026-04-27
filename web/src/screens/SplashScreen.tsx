import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import fieldflixWordLogo from '../assets/fieldflix_word_logo.jpeg'

export default function SplashScreen() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/login')
    }, 2500)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="flex h-full w-full items-center justify-center bg-black font-sans">
      <img
        src={fieldflixWordLogo}
        alt="FieldFlix"
        className="max-h-[76px] w-auto max-w-[min(90vw,360px)] object-contain object-center"
        draggable={false}
      />
    </div>
  )
}
