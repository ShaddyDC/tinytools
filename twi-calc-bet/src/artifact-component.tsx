import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import { ChevronDown, ChevronUp, HelpCircle } from 'lucide-react';

const TwitchPredictionCalculator = () => {
  const [bluePoints, setBluePoints] = useState(1000);
  const [redPoints, setRedPoints] = useState(1000);
  const [probability, setProbability] = useState(50);
  const [betAmount, setBetAmount] = useState(100);
  const [selectedSide, setSelectedSide] = useState('blue');
  const [showHelp, setShowHelp] = useState(false);

  const calculateEV = (betPoints: number, side: string, totalBlue: number, totalRed: number, prob: number) => {
    const winProb = side === 'blue' ? prob / 100 : (100 - prob) / 100;
    const selectedPool = (side === 'blue' ? totalBlue : totalRed) + betPoints;
    const totalPool = selectedPool + (side === 'blue' ? totalRed : totalBlue);

    // If we win, we get our proportion of the total pool
    const winAmount = (betPoints / selectedPool) * totalPool;

    // Expected value = (win probability × win amount) - bet amount
    return winProb * winAmount - betPoints;
  };

  // Generate graph data points
  const generateGraphData = () => {
    const points = [];
    const maxBet = Math.max(bluePoints, redPoints) * 2;

    // Generate 50 points on a logarithmic scale from 1 to maxBet
    for (let i = 0; i <= 50; i++) {
      const betValue = Math.exp(Math.log(1) + (Math.log(maxBet) - Math.log(1)) * (i / 50));
      const roundedBet = Math.round(betValue);

      const blueEV = calculateEV(roundedBet, 'blue', bluePoints, redPoints, probability);
      const redEV = calculateEV(roundedBet, 'red', bluePoints, redPoints, probability);

      points.push({
        bet: roundedBet,
        blueEV,
        redEV
      });
    }
    return points;
  };

  const graphData = generateGraphData();

  // Find optimal bet
  const findOptimalBet = () => {
    const maxBlueEV = Math.max(...graphData.map(d => d.blueEV));
    const maxRedEV = Math.max(...graphData.map(d => d.redEV));

    const bestBlue = graphData.find(d => d.blueEV === maxBlueEV);
    const bestRed = graphData.find(d => d.redEV === maxRedEV);

    if (!bestBlue || !bestRed) throw new Error("No best red or blue value found!");

    return {
      blue: { amount: bestBlue.bet, ev: maxBlueEV },
      red: { amount: bestRed.bet, ev: maxRedEV },
      best: maxBlueEV > maxRedEV ?
        { side: 'blue', amount: bestBlue.bet, ev: maxBlueEV } :
        { side: 'red', amount: bestRed.bet, ev: maxRedEV }
    };
  };

  const optimalBet = findOptimalBet();
  const currentEV = calculateEV(betAmount, selectedSide, bluePoints, redPoints, probability);

  // Format large numbers for axis
  const formatAxisNumber = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const TooltipLabel = ({ children }: { children: any }) => (
    <div className="group relative inline-block">
      <HelpCircle className="w-4 h-4 inline-block ml-1 cursor-help text-gray-400" />
      <div className="opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-opacity bg-gray-800 text-white p-2 rounded absolute z-10 top-full left-1/2 -translate-x-1/2 mt-2 w-64 text-sm">
        {children}
      </div>
    </div>
  );

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="text-center">Twitch Prediction Calculator
          <TooltipLabel>
            This calculator helps you make optimal bets in Twitch predictions by calculating the expected value of your bets based on the current pool sizes and your estimated probability.
          </TooltipLabel>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Blue Points Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Blue Team Points</label>
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div className="relative pt-1">
                <Slider
                  value={[bluePoints]}
                  onValueChange={(value) => setBluePoints(value[0])}
                  min={0}
                  max={1000000}
                  step={1}
                />
              </div>
              <Input
                type="number"
                value={bluePoints}
                onChange={(e) => setBluePoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24"
              />
            </div>
          </div>

          {/* Red Points Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Red Team Points</label>
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div className="relative pt-1">
                <Slider
                  value={[redPoints]}
                  onValueChange={(value) => setRedPoints(value[0])}
                  min={0}
                  max={1000000}
                  step={1}
                />
              </div>
              <Input
                type="number"
                value={redPoints}
                onChange={(e) => setRedPoints(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24"
              />
            </div>
          </div>

          {/* Probability Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Blue Win Probability: {probability}%</label>
            <Slider
              value={[probability]}
              onValueChange={(value) => setProbability(value[0])}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Bet Amount Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Your Bet Amount</label>
            <div className="grid grid-cols-[1fr,auto] gap-4 items-center">
              <div className="relative pt-1">
                <Slider
                  value={[betAmount]}
                  onValueChange={(value) => setBetAmount(value[0])}
                  min={0}
                  max={100000}
                  step={1}
                />
              </div>
              <Input
                type="number"
                value={betAmount}
                onChange={(e) => setBetAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-24"
              />
            </div>
          </div>

          {/* Side Selection */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setSelectedSide('blue')}
              className={`px-4 py-2 rounded ${selectedSide === 'blue'
                ? 'bg-blue-500 text-white'
                : 'bg-blue-100 text-blue-700'
                }`}
            >
              Bet Blue
            </button>
            <button
              onClick={() => setSelectedSide('red')}
              className={`px-4 py-2 rounded ${selectedSide === 'red'
                ? 'bg-red-500 text-white'
                : 'bg-red-100 text-red-700'
                }`}
            >
              Bet Red
            </button>
          </div>

          {/* Current EV Display */}
          <div className={`p-4 rounded-lg text-center ${currentEV > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
            <div className="font-bold text-lg">
              Expected Value: {currentEV.toFixed(1)} points
            </div>
          </div>

          {/* Optimal Bet Display */}
          <div className="p-4 rounded-lg bg-purple-100 text-purple-700 text-center">
            <div className="font-bold">Optimal Bet</div>
            <div>
              {optimalBet.best.side === 'blue' ? 'Blue' : 'Red'}: {Math.round(optimalBet.best.amount).toLocaleString()} points
              (EV: {optimalBet.best.ev.toFixed(1)})
            </div>
          </div>

          {/* EV Graph */}
          <div className="w-full overflow-hidden">
            <LineChart
              data={graphData}
              width={550}
              height={300}
              margin={{ top: 20, right: 20, bottom: 20, left: 40 }}
            >
              <XAxis
                dataKey="bet"
                type="number"
                scale="log"
                domain={[1, 'auto']}
                ticks={[1, 10, 100, 1000, 10000, 100000, 1000000]}
                tickFormatter={formatAxisNumber}
              />
              <YAxis />
              <Tooltip
                formatter={(value, name) => [
                  Math.round(Number(value)),
                  name === 'blueEV' ? 'Blue EV' : 'Red EV'
                ]}
                labelFormatter={(value) => `Bet: ${parseInt(value).toLocaleString()}`}
              />
              <ReferenceLine y={0} stroke="#666" />
              <Line type="monotone" dataKey="blueEV" stroke="#3b82f6" dot={false} isAnimationActive={false} />
              <Line type="monotone" dataKey="redEV" stroke="#ef4444" dot={false} isAnimationActive={false} />
            </LineChart>
          </div>

          {/* Help Section */}
          <div className="mt-8 border-t pt-4">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full text-left text-gray-600 hover:text-gray-900"
            >
              <span className="font-medium">How does this work?</span>
              {showHelp ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>

            {showHelp && (
              <div className="mt-4 space-y-4 text-gray-600 text-sm">
                <p><strong>Basic Concept:</strong> In Twitch predictions, all points bet on the winning side are rewarded with a proportional share of the points bet on the losing side.</p>

                <p><strong>The Math:</strong></p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>If you win, you get back your proportion of the total pool. Your proportion is your bet divided by all bets on your side.</li>
                  <li>Example: If you bet 100 points on blue, which has 900 other points (1000 total), and red has 2000 points:
                    <ul className="list-disc pl-5 mt-1">
                      <li>Your proportion: 100/1000 = 10%</li>
                      <li>If blue wins: You get 10% of 3000 (total pool) = 300 points</li>
                      <li>Minus your 100 point investment = 200 point profit</li>
                    </ul>
                  </li>
                </ul>

                <p><strong>Expected Value (EV):</strong></p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>EV combines the potential winnings with the probability of winning</li>
                  <li>EV = (Win Probability × Potential Winnings) - Bet Amount</li>
                  <li>Positive EV means the bet is mathematically profitable in the long run</li>
                  <li>The graph shows the EV for different bet amounts on both sides</li>
                </ul>

                <p><strong>Tips:</strong></p>
                <ul className="list-disc pl-5 space-y-2">
                  <li>Look for situations where your estimated probability differs from what the current betting pool implies</li>
                  <li>The optimal bet amount isn't always the maximum - sometimes smaller bets have better EV</li>
                  <li>Remember that your probability estimate needs to be accurate for the EV calculation to be meaningful</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TwitchPredictionCalculator;
