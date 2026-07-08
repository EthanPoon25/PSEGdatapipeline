import logo from './logo.svg';
import './App.css';
import { useState, useEffect } from 'react';
import axios from 'axios'

function App() {
  const [readings, setReadings] = useState([])
  const [isSpiking, setIsSpiking] = useState(false)
  useEffect(() => {
      const interval = setInterval(() => {
          axios.get("http://localhost:8080/data").then(res => {
              setReadings(res.data)
              setIsSpiking(res.data.some(r => r.turbidity > 5.0))
          })
      }, 2000)
      return () => clearInterval(interval)
  }, [])
  return (
    <div className="App">
      
    </div>
  );
}

export default App;
