import { _decorator, Component, Node, Graphics, Label, Button, Color } from 'cc'
const { ccclass, property } = _decorator

import { judge } from '../../../../js/roguelike/identification.mjs'
import { HarvestProgress } from '../../../../js/roguelike/harvest.mjs'

// Types
type MushroomCard = {
  id: string
  name: string
  rarity: 1 | 2 | 3
  clues: [string, string, string]
  colorCap: string
  colorStem: string
  weightInPool: number
}

type Challenge = {
  correctId: string
  options: [string, string, string]
  clues: [string, string, string]
  deadline: number
}

type EncounterInput =
  | { kind: 'mushroom'; challenge: Challenge; target: MushroomCard }
  | { kind: 'animal' }
  | { kind: 'campfire' }
  | { kind: 'danger' }

type EncounterOutcome =
  | { kind: 'mushroom'; verdict: 'correct' | 'wrong' | 'timeout'; target: MushroomCard }
  | { kind: 'animal'; choice: 'evade' | 'grab' }
  | { kind: 'campfire'; choice: 'heal' | 'compass' }
  | { kind: 'danger' }

@ccclass('EncounterView')
export class EncounterView extends Component {
  // Mushroom panel elements
  @property(Node) mushroomPanel: Node = null!
  @property(Label) cluesLabel: Label = null!
  @property(Button) optionAButton: Button = null!
  @property(Button) optionBButton: Button = null!
  @property(Button) optionCButton: Button = null!
  @property(Graphics) timerRing: Graphics = null!
  @property(Node) mushroomArt: Node = null!
  @property(Graphics) mushroomArtGraphics: Graphics = null!
  @property(Graphics) harvestRing: Graphics = null!
  @property(Label) mushroomResultLabel: Label = null!

  // Choice panel elements (for animal & campfire)
  @property(Node) choicePanel: Node = null!
  @property(Label) choiceTitleLabel: Label = null!
  @property(Label) choiceALabel: Label = null!
  @property(Label) choiceBLabel: Label = null!
  @property(Button) choiceAButton: Button = null!
  @property(Button) choiceBButton: Button = null!

  // Danger panel elements
  @property(Node) dangerPanel: Node = null!
  @property(Label) dangerLabel: Label = null!
  @property(Button) dangerButton: Button = null!

  private currentResolve: ((outcome: EncounterOutcome) => void) | null = null
  private currentInput: EncounterInput | null = null
  private countdownStartTime: number = 0
  private harvestProgress: HarvestProgress | null = null
  private optionHandlers: Array<() => void> = []
  private _choiceHandled: boolean = false
  private choiceHandlers: Array<{ button: Node; handler: () => void }> = []

  show(input: EncounterInput): Promise<EncounterOutcome> {
    this.currentInput = input
    this.node.active = true

    // Deactivate all panels first
    this.mushroomPanel.active = false
    this.choicePanel.active = false
    this.dangerPanel.active = false

    return new Promise<EncounterOutcome>((resolve) => {
      this.currentResolve = resolve

      switch (input.kind) {
        case 'mushroom':
          this.showMushroomEncounter(input.challenge, input.target)
          break
        case 'animal':
          this.showAnimalEncounter()
          break
        case 'campfire':
          this.showCampfireEncounter()
          break
        case 'danger':
          this.showDangerEncounter()
          break
      }
    })
  }

  private showMushroomEncounter(challenge: Challenge, target: MushroomCard): void {
    this.mushroomPanel.active = true
    this.mushroomArt.active = false
    this.mushroomResultLabel.node.active = false
    this._choiceHandled = false

    // Show clues
    this.cluesLabel.string = challenge.clues.join('\n')

    // Clear previous handlers
    this.removeOptionHandlers()

    // Show option buttons
    const buttons = [this.optionAButton, this.optionBButton, this.optionCButton]
    const optionLabels = ['A', 'B', 'C']

    buttons.forEach((btn, i) => {
      btn.node.active = true
      const label = btn.node.getComponentInChildren(Label)
      if (label) {
        label.string = optionLabels[i]
      }

      // Create and store handler
      const handler = () => {
        this.handleMushroomChoice(challenge, challenge.options[i], target)
      }
      this.optionHandlers.push(handler)

      // Attach touch listener
      btn.node.on(Node.EventType.TOUCH_END, handler, this)
    })

    // Start countdown timer
    this.countdownStartTime = Date.now()
    this.schedule(this.updateCountdownRing, 0)

    // Check for timeout
    this.scheduleOnce(() => {
      this.handleMushroomChoice(challenge, '', target) // Empty string for timeout
    }, 3)
  }

  private updateCountdownRing(dt: number): void {
    if (!this.currentInput || this.currentInput.kind !== 'mushroom') return

    const elapsed = (Date.now() - this.countdownStartTime) / 1000
    const progress = Math.min(1, elapsed / 3)

    // Draw countdown ring (shrinking from full to empty)
    this.timerRing.clear()
    this.timerRing.lineWidth = 8
    const color = new Color(255, 200, 0, 255)
    this.timerRing.strokeColor = color

    const startAngle = -Math.PI / 2
    const endAngle = startAngle + (1 - progress) * 2 * Math.PI

    this.timerRing.arc(0, 0, 100, startAngle, endAngle, false)
    this.timerRing.stroke()
  }

  private handleMushroomChoice(challenge: Challenge, chosenId: string, target: MushroomCard): void {
    // Prevent duplicate handling (from timeout callback firing after user choice)
    if (this._choiceHandled) return
    this._choiceHandled = true

    // Stop timer
    this.unschedule(this.updateCountdownRing)

    // Remove option button listeners
    this.removeOptionHandlers()

    const verdict = judge(challenge, chosenId, Date.now())

    // Hide option buttons
    this.optionAButton.node.active = false
    this.optionBButton.node.active = false
    this.optionCButton.node.active = false
    this.timerRing.clear()

    if (verdict === 'correct') {
      // Show mushroom art for harvesting
      this.showMushroomHarvest(target)
    } else {
      // Show result message and resolve
      this.mushroomResultLabel.node.active = true
      this.mushroomResultLabel.string = verdict === 'timeout' ? '超时了' : '认错了'

      this.scheduleOnce(() => {
        this.resolveEncounter({ kind: 'mushroom', verdict, target })
      }, 0.5)
    }
  }

  private removeOptionHandlers(): void {
    const buttons = [this.optionAButton, this.optionBButton, this.optionCButton]
    buttons.forEach((btn, i) => {
      if (btn && this.optionHandlers[i]) {
        btn.node.off(Node.EventType.TOUCH_END, this.optionHandlers[i], this)
      }
    })
    this.optionHandlers = []
  }

  private removeChoiceHandlers(): void {
    this.choiceHandlers.forEach(({ button, handler }) => {
      button.off(Node.EventType.TOUCH_END, handler, this)
    })
    this.choiceHandlers = []
  }

  private showMushroomHarvest(target: MushroomCard): void {
    this.mushroomArt.active = true

    // Draw mushroom art (circle cap + rectangle stem)
    this.mushroomArtGraphics.clear()

    // Draw cap (circle)
    const capColor = new Color()
    capColor.fromHEX(target.colorCap)
    this.mushroomArtGraphics.fillColor = capColor
    this.mushroomArtGraphics.circle(0, 80, 60)
    this.mushroomArtGraphics.fill()

    // Draw stem (rectangle)
    const stemColor = new Color()
    stemColor.fromHEX(target.colorStem)
    this.mushroomArtGraphics.fillColor = stemColor
    this.mushroomArtGraphics.rect(-30, -40, 60, 120)
    this.mushroomArtGraphics.fill()

    // Initialize harvest progress
    this.harvestProgress = new HarvestProgress(1500)

    // Attach touch listeners for long-press
    this.mushroomArt.on(Node.EventType.TOUCH_START, this.onHarvestTouchStart, this)
    this.mushroomArt.on(Node.EventType.TOUCH_END, this.onHarvestTouchEnd, this)
    this.mushroomArt.on(Node.EventType.TOUCH_CANCEL, this.onHarvestTouchEnd, this)

    // Start tick loop
    this.schedule(this.updateHarvestProgress, 0)
  }

  private onHarvestTouchStart(): void {
    if (this.harvestProgress) {
      this.harvestProgress.start(Date.now())
    }
  }

  private onHarvestTouchEnd(): void {
    if (this.harvestProgress) {
      this.harvestProgress.release(Date.now())
    }
  }

  private updateHarvestProgress(dt: number): void {
    if (!this.harvestProgress) return

    const progress = this.harvestProgress.tick(Date.now())

    // Draw harvest ring
    this.harvestRing.clear()
    this.harvestRing.lineWidth = 8
    const color = new Color(100, 200, 100, 255)
    this.harvestRing.strokeColor = color

    const startAngle = -Math.PI / 2
    const endAngle = startAngle + progress * 2 * Math.PI

    this.harvestRing.arc(0, 0, 120, startAngle, endAngle, false)
    this.harvestRing.stroke()

    // Check if complete
    if (this.harvestProgress.isComplete) {
      this.unschedule(this.updateHarvestProgress)
      this.mushroomArt.off(Node.EventType.TOUCH_START, this.onHarvestTouchStart, this)
      this.mushroomArt.off(Node.EventType.TOUCH_END, this.onHarvestTouchEnd, this)
      this.mushroomArt.off(Node.EventType.TOUCH_CANCEL, this.onHarvestTouchEnd, this)

      const target = (this.currentInput as any).target
      this.resolveEncounter({ kind: 'mushroom', verdict: 'correct', target })
    }
  }

  private showAnimalEncounter(): void {
    this.choicePanel.active = true
    this.choiceTitleLabel.string = '野兽出没！'
    this.choiceALabel.string = '绕行'
    this.choiceBLabel.string = '抢先'

    this.removeChoiceHandlers()

    const handlerA = () => {
      this.removeChoiceHandlers()
      this.resolveEncounter({ kind: 'animal', choice: 'evade' })
    }
    const handlerB = () => {
      this.removeChoiceHandlers()
      this.resolveEncounter({ kind: 'animal', choice: 'grab' })
    }

    this.choiceAButton.node.on(Node.EventType.TOUCH_END, handlerA, this)
    this.choiceBButton.node.on(Node.EventType.TOUCH_END, handlerB, this)

    this.choiceHandlers.push(
      { button: this.choiceAButton.node, handler: handlerA },
      { button: this.choiceBButton.node, handler: handlerB }
    )
  }

  private showCampfireEncounter(): void {
    this.choicePanel.active = true
    this.choiceTitleLabel.string = '篝火时刻'
    this.choiceALabel.string = '休息 +1 心'
    this.choiceBLabel.string = '望气（下节点可见）'

    this.removeChoiceHandlers()

    const handlerA = () => {
      this.removeChoiceHandlers()
      this.resolveEncounter({ kind: 'campfire', choice: 'heal' })
    }
    const handlerB = () => {
      this.removeChoiceHandlers()
      this.resolveEncounter({ kind: 'campfire', choice: 'compass' })
    }

    this.choiceAButton.node.on(Node.EventType.TOUCH_END, handlerA, this)
    this.choiceBButton.node.on(Node.EventType.TOUCH_END, handlerB, this)

    this.choiceHandlers.push(
      { button: this.choiceAButton.node, handler: handlerA },
      { button: this.choiceBButton.node, handler: handlerB }
    )
  }

  private showDangerEncounter(): void {
    this.dangerPanel.active = true
    this.dangerLabel.string = '毒菌陷阱'

    this.removeChoiceHandlers()

    const handler = () => {
      this.removeChoiceHandlers()
      this.resolveEncounter({ kind: 'danger' })
    }

    this.dangerButton.node.on(Node.EventType.TOUCH_END, handler, this)

    this.choiceHandlers.push({ button: this.dangerButton.node, handler })
  }

  private resolveEncounter(outcome: EncounterOutcome): void {
    // Clean up all scheduled callbacks
    this.unscheduleAllCallbacks()

    // Hide the view
    this.node.active = false

    // Resolve the promise
    if (this.currentResolve) {
      this.currentResolve(outcome)
      this.currentResolve = null
    }

    this.currentInput = null
  }

  onDestroy(): void {
    // Clean up all listeners and scheduled callbacks
    this.unscheduleAllCallbacks()

    // Remove mushroom option button listeners
    this.removeOptionHandlers()

    // Remove choice button listeners (animal/campfire/danger)
    this.removeChoiceHandlers()

    // Remove harvest touch listeners
    if (this.mushroomArt) {
      this.mushroomArt.off(Node.EventType.TOUCH_START, this.onHarvestTouchStart, this)
      this.mushroomArt.off(Node.EventType.TOUCH_END, this.onHarvestTouchEnd, this)
      this.mushroomArt.off(Node.EventType.TOUCH_CANCEL, this.onHarvestTouchEnd, this)
    }
  }
}
