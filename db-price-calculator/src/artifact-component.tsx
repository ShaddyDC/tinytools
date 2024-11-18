import { useState, useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import data from "@/tickets.json"

const PriceCalculator = () => {
  const defaultPrices = {
    superSparpreis2: 55.99,
    superSparpreis1: 133.99,
    sparpreis2: 64.99,
    sparpreis1: 148.99,
    flexpreis2: 164.30,
    flexpreis1: 295.60
  }

  const [prices, setPrices] = useState<any>(defaultPrices)
  const [showFirstClass, setShowFirstClass] = useState(true)
  const [showSparpreis, setShowSparpreis] = useState(true)
  const [showProbeTickets, setShowProbeTickets] = useState(true)
  const [numberOfTrips, setNumberOfTrips] = useState(1)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null) // New state for timestamp
  const [bahncardData, setBahncardData] = useState<any>({})
  const [selectedGroup, setSelectedGroup] = useState('')
  const [availableGroups, setAvailableGroups] = useState<any>([])

  useEffect(() => {
    const loadBahncardData = async () => {
      try {
        setBahncardData(data.tickets)
        const groups = Object.keys(data.tickets)
        setAvailableGroups(groups)
        if (groups.length > 0 && !selectedGroup) {
          setSelectedGroup(groups[0])
        }
        if (data.timestamp) {
          setLastUpdated(new Date(data.timestamp))
        }
      } catch (error) {
        console.error('Error loading bahncard data:', error)
      }
    }
    loadBahncardData()
  }, [])

  const formatTimestamp = (date: Date) => {
    if (!date) return ''
    return new Intl.DateTimeFormat('de-DE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(date)
  }

  const getBahncardPrice = (classType: string, bcType: string, probe = false) => {
    const cards = bahncardData[selectedGroup] || []
    const card = cards.find((card: any) =>
      (card.class === classType || card.class === null) &&
      card.type === bcType &&
      card.isProbe === probe
    )
    return card?.price || 0
  }

  const calculateDiscountedPrice = (basePrice: number, cardType: string, priceKey: string) => {
    switch (cardType) {
      case 'BC25':
      case 'ProbeBC25':
        return basePrice * 0.75
      case 'BC50':
      case 'ProbeBC50':
        return basePrice * (priceKey.includes('flex') ? 0.5 : 0.75)
      case 'BC100':
        return 0
      default:
        return basePrice
    }
  }

  const calculateBreakeven = (cardPrice: number, regularPrice: number, discountedPrice: number, isProbe = false) => {
    const savingsPerTrip = regularPrice - discountedPrice
    if (savingsPerTrip <= 0) return { trips: Infinity, savingsPerTrip: 0 }
    const trips = Math.ceil(cardPrice / savingsPerTrip)
    // If it's a probe card, we need to consider the 3-month limitation
    const maxTrips = isProbe ? 90 : Infinity // Assuming 1 trip per day max for probe cards
    return {
      trips: trips > maxTrips ? Infinity : trips,
      savingsPerTrip,
      totalSavings: trips * savingsPerTrip,
      cardPrice,
      firstTripTotal: discountedPrice + cardPrice,
      isProbe
    }
  }

  const formatCurrency = (amount: number) => {
    return amount.toFixed(2) + '€'
  }

  const PriceTooltip = ({ ticketPrice, cardPrice, trips, isProbe = false }:
    { ticketPrice: number, cardPrice: number, trips: number, isProbe?: boolean }) => {
    const totalTicketPrice = ticketPrice * trips
    return (
      <div className="text-sm">
        <div>Per Trip: {formatCurrency(ticketPrice)}</div>
        <div>{trips} Trips: {formatCurrency(totalTicketPrice)}</div>
        <div>+ Card: {formatCurrency(cardPrice)}</div>
        <div className="border-t border-gray-600 mt-1 pt-1">
          Total: {formatCurrency(totalTicketPrice + cardPrice)}
        </div>
        {isProbe && (
          <div className="text-yellow-500 text-xs mt-1">
            *Valid for 3 months only
          </div>
        )}
      </div>
    )
  }
  const BreezevenTooltip = ({ calculation }: any) => {
    if (calculation.trips === Infinity) return null

    const { trips, savingsPerTrip, totalSavings, cardPrice, firstTripTotal, isProbe } = calculation
    return (
      <div className="text-sm space-y-1">
        <div>First trip total: {formatCurrency(firstTripTotal)}</div>
        <div>Savings per trip: {formatCurrency(savingsPerTrip)}</div>
        <div className="flex space-x-1">
          <span className="text-green-500">{trips} × {formatCurrency(savingsPerTrip)} = {formatCurrency(totalSavings)}</span>
          <span>{'>'}</span>
          <span className="text-red-500">{formatCurrency(cardPrice)}</span>
        </div>
        {isProbe && (
          <div className="text-yellow-500 text-xs">
            *Must be used within 3 months
          </div>
        )}
      </div>
    )
  }

  const results = useMemo(() => {
    if (!selectedGroup) return []

    const calculations: any[] = []
    const classes = ['2', '1']

    classes.forEach(classType => {
      if (classType === '1' && !showFirstClass) return

      const priceTypes = [
        { name: 'Super Sparpreis', key: 'superSparpreis' },
        { name: 'Sparpreis', key: 'sparpreis', show: showSparpreis },
        { name: 'Flexpreis', key: 'flexpreis' }
      ]

      priceTypes.forEach(priceType => {
        if (!priceType.show && priceType.key === 'sparpreis') return

        const priceKey = `${priceType.key}${classType}`
        const basePrice = prices[priceKey]
        const bc25Price = calculateDiscountedPrice(basePrice, 'BC25', priceKey)
        const bc50Price = calculateDiscountedPrice(basePrice, 'BC50', priceKey)
        const probeBC25Price = calculateDiscountedPrice(basePrice, 'ProbeBC25', priceKey)
        const probeBC50Price = calculateDiscountedPrice(basePrice, 'ProbeBC50', priceKey)

        const bahncardPrices = {
          BC25: getBahncardPrice(classType, '25', false),
          BC50: getBahncardPrice(classType, '50', false),
          BC100: getBahncardPrice(classType, '100', false),
          ProbeBC25: getBahncardPrice(classType, '25', true),
          ProbeBC50: getBahncardPrice(classType, '50', true)
        }

        calculations.push({
          name: `${priceType.name} ${classType}. Klasse`,
          basePrice,
          bc25Price,
          bc50Price,
          bc100Price: 0,
          probeBC25Price,
          probeBC50Price,
          bahncardPrices,
          breakevenBC25: calculateBreakeven(bahncardPrices.BC25, basePrice, bc25Price),
          breakevenBC50: calculateBreakeven(bahncardPrices.BC50, basePrice, bc50Price),
          breakevenBC100: calculateBreakeven(bahncardPrices.BC100, basePrice, 0),
          breakevenProbeBC25: calculateBreakeven(bahncardPrices.ProbeBC25, basePrice, probeBC25Price, true),
          breakevenProbeBC50: calculateBreakeven(bahncardPrices.ProbeBC50, basePrice, probeBC50Price, true)
        })
      })
    })

    return calculations
  }, [prices, showFirstClass, showSparpreis, selectedGroup])

  const handlePriceChange = (key: string, value: string) => {
    setPrices((prev: any )=> ({
      ...prev,
      [key]: parseFloat(value) || 0
    }))
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>DB Ticket Price Calculator</CardTitle>
                {lastUpdated && (
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="text-sm text-gray-500">
                        Stand: {formatTimestamp(lastUpdated)}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Letzte Aktualisierung der Preisdaten</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            </CardHeader>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="space-y-2">
                <Label>Age Group</Label>
                <Select value={selectedGroup} onValueChange={setSelectedGroup}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableGroups.map((group: string) => (
                      <SelectItem key={group} value={group}>
                        {group}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Number of Trips</Label>
                <Input
                  type="number"
                  min="1"
                  value={numberOfTrips}
                  onChange={(e) => setNumberOfTrips(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              <div className="space-y-2 flex items-center">
                <div className="flex flex-col gap-2">
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showFirstClass}
                      onCheckedChange={setShowFirstClass}
                    />
                    <Label>Show 1. Klasse</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showSparpreis}
                      onCheckedChange={setShowSparpreis}
                    />
                    <Label>Show Sparpreis</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={showProbeTickets}
                      onCheckedChange={setShowProbeTickets}
                    />
                    <Label>Show Probe BahnCards</Label>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-gray-500">2. Klasse Tickets</h3>
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label className="text-sm">Super Sparpreis</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={prices.superSparpreis2}
                        onChange={(e) => handlePriceChange('superSparpreis2', e.target.value)}
                        className="w-full"
                      />
                    </div>
                    {showSparpreis && (
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Label className="text-sm">Sparpreis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={prices.sparpreis2}
                          onChange={(e) => handlePriceChange('sparpreis2', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 items-center">
                      <Label className="text-sm">Flexpreis</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={prices.flexpreis2}
                        onChange={(e) => handlePriceChange('flexpreis2', e.target.value)}
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {showFirstClass && (
                  <div className="space-y-2">
                    <h3 className="font-medium text-sm text-gray-500">1. Klasse Tickets</h3>
                    <div className="space-y-2">
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Label className="text-sm">Super Sparpreis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={prices.superSparpreis1}
                          onChange={(e) => handlePriceChange('superSparpreis1', e.target.value)}
                          className="w-full"
                        />
                      </div>
                      {showSparpreis && (
                        <div className="grid grid-cols-2 gap-2 items-center">
                          <Label className="text-sm">Sparpreis</Label>
                          <Input
                            type="number"
                            step="0.01"
                            value={prices.sparpreis1}
                            onChange={(e) => handlePriceChange('sparpreis1', e.target.value)}
                            className="w-full"
                          />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-2 items-center">
                        <Label className="text-sm">Flexpreis</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={prices.flexpreis1}
                          onChange={(e) => handlePriceChange('flexpreis1', e.target.value)}
                          className="w-full"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Price Comparison ({numberOfTrips} trip{numberOfTrips > 1 ? 's' : ''})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ticket Type</th>
                    <th className="text-right p-2">Normal</th>
                    <th className="text-right p-2">BC25</th>
                    {showProbeTickets && <th className="text-right p-2">Probe BC25</th>}
                    <th className="text-right p-2">BC50</th>
                    {showProbeTickets && <th className="text-right p-2">Probe BC50</th>}
                    <th className="text-right p-2">BC100</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{result.name}</td>
                      <td className="text-right p-2">{formatCurrency(result.basePrice * numberOfTrips)}</td>
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {formatCurrency(result.bc25Price * numberOfTrips + result.bahncardPrices.BC25)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <PriceTooltip
                              ticketPrice={result.bc25Price}
                              cardPrice={result.bahncardPrices.BC25}
                              trips={numberOfTrips}
                            />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {showProbeTickets && (
                        <td className="text-right p-2">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              {formatCurrency(result.probeBC25Price * numberOfTrips + result.bahncardPrices.ProbeBC25)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <PriceTooltip
                                ticketPrice={result.probeBC25Price}
                                cardPrice={result.bahncardPrices.ProbeBC25}
                                trips={numberOfTrips}
                                isProbe={true}
                              />
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )}
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {formatCurrency(result.bc50Price * numberOfTrips + result.bahncardPrices.BC50)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <PriceTooltip
                              ticketPrice={result.bc50Price}
                              cardPrice={result.bahncardPrices.BC50}
                              trips={numberOfTrips}
                            />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {showProbeTickets && (
                        <td className="text-right p-2">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              {formatCurrency(result.probeBC50Price * numberOfTrips + result.bahncardPrices.ProbeBC50)}
                            </TooltipTrigger>
                            <TooltipContent>
                              <PriceTooltip
                                ticketPrice={result.probeBC50Price}
                                cardPrice={result.bahncardPrices.ProbeBC50}
                                trips={numberOfTrips}
                                isProbe={true}
                              />
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )}
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {formatCurrency(result.bc100Price * numberOfTrips + result.bahncardPrices.BC100)}
                          </TooltipTrigger>
                          <TooltipContent>
                            <PriceTooltip
                              ticketPrice={result.bc100Price}
                              cardPrice={result.bahncardPrices.BC100}
                              trips={numberOfTrips}
                            />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Breakeven Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Ticket Type</th>
                    <th className="text-right p-2">BC25</th>
                    {showProbeTickets && <th className="text-right p-2">Probe BC25</th>}
                    <th className="text-right p-2">BC50</th>
                    {showProbeTickets && <th className="text-right p-2">Probe BC50</th>}
                    <th className="text-right p-2">BC100</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{result.name}</td>
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {result.breakevenBC25.trips === Infinity ? '∞' : result.breakevenBC25.trips}
                          </TooltipTrigger>
                          <TooltipContent>
                            <BreezevenTooltip calculation={result.breakevenBC25} />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {showProbeTickets && (
                        <td className="text-right p-2">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              {result.breakevenProbeBC25.trips === Infinity ? '∞' : result.breakevenProbeBC25.trips}
                            </TooltipTrigger>
                            <TooltipContent>
                              <BreezevenTooltip calculation={result.breakevenProbeBC25} />
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )}
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {result.breakevenBC50.trips === Infinity ? '∞' : result.breakevenBC50.trips}
                          </TooltipTrigger>
                          <TooltipContent>
                            <BreezevenTooltip calculation={result.breakevenBC50} />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                      {showProbeTickets && (
                        <td className="text-right p-2">
                          <Tooltip>
                            <TooltipTrigger className="cursor-help">
                              {result.breakevenProbeBC50.trips === Infinity ? '∞' : result.breakevenProbeBC50.trips}
                            </TooltipTrigger>
                            <TooltipContent>
                              <BreezevenTooltip calculation={result.breakevenProbeBC50} />
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )}
                      <td className="text-right p-2">
                        <Tooltip>
                          <TooltipTrigger className="cursor-help">
                            {result.breakevenBC100.trips === Infinity ? '∞' : result.breakevenBC100.trips}
                          </TooltipTrigger>
                          <TooltipContent>
                            <BreezevenTooltip calculation={result.breakevenBC100} />
                          </TooltipContent>
                        </Tooltip>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  )
}

export default PriceCalculator
