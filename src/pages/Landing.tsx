import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Mascot from '../components/Mascot'

export default function Landing() {
  const [opening, setOpening] = useState(false)
  const navigate = useNavigate()

  const handleOpen = () => {
    setOpening(true)
    setTimeout(() => navigate('/setup'), 500)
  }

  return (
    <div className="landing">
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <motion.div
          className="binder-cover"
          animate={opening ? { rotateY: -12, x: -40 } : { rotateY: 0, x: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="binder-cover-inner">
            <h1>Plan4SFU</h1>
            <p className="muted">Your cozy study binder for planning.</p>
            <button onClick={handleOpen}>Open Binder</button>
          </div>
        </motion.div>
        <div style={{ position: 'absolute', right: '-60px', bottom: '-30px' }}>
          <Mascot variant="default" size={160} />
        </div>
      </div>
    </div>
  )
}
