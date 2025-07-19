interface ResourceProps {
  type: 'mem' | 'cpu'
  value: string
}

export default function Resource({ type, value }: ResourceProps) {
  const label = type === 'mem' ? 'MB' : 'Core'

  return (
    <p>
      {value} {label}
    </p>
  )
}
