export default function LiquidityBar({ yes, no }) {

    const total = yes + no
    const yesWidth = (yes / total) * 100
  
    return (
  
      <div className="w-full h-2 bg-gray-200 rounded mt-3 overflow-hidden">
  
        <div
          className="h-full bg-green-500"
          style={{ width: `${yesWidth}%` }}
        />
  
      </div>
  
    )
  
  }