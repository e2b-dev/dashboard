'use client'

import { useState } from 'react'
import { Calendar } from './primitives/calendar'

// test component to demonstrate calendar with min/max date limits
export default function TestCalendarLimits() {
  const [selected, setSelected] = useState<Date | undefined>(new Date())

  // calculate min and max dates
  const today = new Date()
  const minDate = new Date()
  minDate.setDate(today.getDate() - 31) // 31 days ago
  minDate.setHours(0, 0, 0, 0)

  const maxDate = new Date()
  maxDate.setSeconds(maxDate.getSeconds() + 60) // 60 seconds in future for clock skew tolerance

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">
        Calendar with Min/Max Date Limits
      </h2>
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Min Date: {minDate.toLocaleDateString()} (31 days ago)
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Max Date: {maxDate.toLocaleDateString()} (today + 60s tolerance)
          </p>
          <p className="text-sm text-gray-600 mb-2">
            Selected: {selected?.toLocaleDateString()}
          </p>
        </div>

        <Calendar
          mode="single"
          selected={selected}
          onSelect={setSelected}
          minDate={minDate}
          maxDate={maxDate}
          className="rounded-md border"
        />

        <div className="text-sm text-gray-500">
          <p>• Dates outside the 31-day range are disabled</p>
          <p>• Future dates are disabled (with 60s tolerance)</p>
          <p>• Disabled dates appear grayed out and cannot be selected</p>
        </div>
      </div>
    </div>
  )
}
