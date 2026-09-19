import { _decorator, Component, Node, Graphics, Label, Button, Color, UITransform } from 'cc'
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

  onLoad(): void {
    if (!this.mushroomPanel || !this.choicePanel || !this.dangerPanel) {
      this.bootstrapUI()
    }
    // Start hidden
    this.node.active = false
  }

  private bootstrapUI(): void {
    const rootUI = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    rootUI.setContentSize(750, 1334)

    // Dim background
    const bg = new Node('EncounterBG')
    bg.setParent(this.node)
    bg.addComponent(UITransform).setContentSize(750, 1334)
    const bgG = bg.addComponent(Graphics)
    bgG.fillColor = new Color(15, 25, 20, 210)
    bgG.rect(-375, -667, 750, 1334)
    bgG.fill()

    this.buildMushroomPanel()
    this.buildChoicePanel()
    this.buildDangerPanel()
  }

  private buildMushroomPanel(): void {
    this.mushroomPanel = new Node('MushroomPanel')
    this.mushroomPanel.setParent(this.node)
    this.mushroomPanel.addComponent(UITransform).setContentSize(750, 1200)

    // Clues label (3 lines)
    const clueNode = new Node('CluesLabel')
    clueNode.setParent(this.mushroomPanel)
    clueNode.addComponent(UITransform).setContentSize(680, 220)
    clueNode.setPosition(0, 380, 0)
    this.cluesLabel = clueNode.addComponent(Label)
    this.cluesLabel.useSystemFont = true
    this.cluesLabel.fontSize = 30
    this.cluesLabel.color = new Color().fromHEX('#ffffff')
    this.cluesLabel.enableWrapText = true

    // Timer ring (centered above options)
    const timerNode = new Node('TimerRing')
    timerNode.setParent(this.mushroomPanel)
    timerNode.addComponent(UITransform).setContentSize(220, 220)
    timerNode.setPosition(0, 120, 0)
    this.timerRing = timerNode.addComponent(Graphics)

    // 3 option buttons
    this.optionAButton = this.makeOptionButton('OptionA', 'A', -220, -50)
    this.optionBButton = this.makeOptionButton('OptionB', 'B', 0, -50)
    this.optionCButton = this.makeOptionButton('OptionC', 'C', 220, -50)

    // Mushroom art (revealed on correct)
    this.mushroomArt = new Node('MushroomArt')
    this.mushroomArt.setParent(this.mushroomPanel)
    this.mushroomArt.addComponent(UITransform).setContentSize(320, 320)
    this.mushroomArt.setPosition(0, 0, 0)
    this.mushroomArtGraphics = this.mushroomArt.addComponent(Graphics)
    this.mushroomArt.active = false

    // Harvest ring
    const harvestNode = new Node('HarvestRing')
    harvestNode.setParent(this.mushroomPanel)
    harvestNode.addComponent(UITransform).setContentSize(280, 280)
    harvestNode.setPosition(0, 0, 0)
    this.harvestRing = harvestNode.addComponent(Graphics)

    // Result label (认错了 / 超时了)
    const resultNode = new Node('MushroomResult')
    resultNode.setParent(this.mushroomPanel)
    resultNode.addComponent(UITransform).setContentSize(400, 80)
    resultNode.setPosition(0, 0, 0)
    this.mushroomResultLabel = resultNode.addComponent(Label)
    this.mushroomResultLabel.useSystemFont = true
    this.mushroomResultLabel.fontSize = 48
    this.mushroomResultLabel.color = new Color().fromHEX('#ff8a6a')
    resultNode.active = false
  }

  private makeOptionButton(name: string, text: string, x: number, y: number): Button {
    const btn = new Node(name)
    btn.setParent(this.mushroomPanel)
    btn.addComponent(UITransform).setContentSize(180, 100)
    btn.setPosition(x, y, 0)

    const g = btn.addComponent(Graphics)
    g.fillColor = new Color().fromHEX('#c9b384')
    g.roundRect(-90, -50, 180, 100, 12)
    g.fill()

    const labelNode = new Node('Label')
    labelNode.setParent(btn)
    labelNode.addComponent(UITransform).setContentSize(180, 100)
    const label = labelNode.addComponent(Label)
    label.useSystemFont = true
    label.fontSize = 42
    label.color = new Color().fromHEX('#2a2a2a')
    label.string = text

    return btn.addComponent(Button)
  }

  private buildChoicePanel(): void {
    this.choicePanel = new Node('ChoicePanel')
    this.choicePanel.setParent(this.node)
    this.choicePanel.addComponent(UITransform).setContentSize(750, 700)

    // Title label
    const titleNode = new Node('ChoiceTitle')
    titleNode.setParent(this.choicePanel)
    titleNode.addComponent(UITransform).setContentSize(700, 80)
    titleNode.setPosition(0, 200, 0)
    this.choiceTitleLabel = titleNode.addComponent(Label)
    this.choiceTitleLabel.useSystemFont = true
    this.choiceTitleLabel.fontSize = 48
    this.choiceTitleLabel.color = new Color().fromHEX('#ffffff')

    // Choice A + Choice B buttons
    const { button: btnA, label: labelA } = this.makeChoiceButton('ChoiceA', 0, 50, '#6c9560')
    this.choiceAButton = btnA
    this.choiceALabel = labelA

    const { button: btnB, label: labelB } = this.makeChoiceButton('ChoiceB', 0, -80, '#8ba85f')
    this.choiceBButton = btnB
    this.choiceBLabel = labelB
  }

  private makeChoiceButton(name: string, x: number, y: number, hex: string): { button: Button; label: Label } {
    const btn = new Node(name)
    btn.setParent(this.choicePanel)
    btn.addComponent(UITransform).setContentSize(500, 100)
    btn.setPosition(x, y, 0)

    const g = btn.addComponent(Graphics)
    g.fillColor = new Color().fromHEX(hex)
    g.roundRect(-250, -50, 500, 100, 12)
    g.fill()

    const labelNode = new Node('Label')
    labelNode.setParent(btn)
    labelNode.addComponent(UITransform).setContentSize(500, 100)
    const label = labelNode.addComponent(Label)
    label.useSystemFont = true
    label.fontSize = 34
    label.color = new Color().fromHEX('#ffffff')

    return { button: btn.addComponent(Button), label }
  }

  private buildDangerPanel(): void {
    this.dangerPanel = new Node('DangerPanel')
    this.dangerPanel.setParent(this.node)
    this.dangerPanel.addComponent(UITransform).setContentSize(750, 500)

    const titleNode = new Node('DangerLabel')
    titleNode.setParent(this.dangerPanel)
    titleNode.addComponent(UITransform).setContentSize(700, 80)
    titleNode.setPosition(0, 100, 0)
    this.dangerLabel = titleNode.addComponent(Label)
    this.dangerLabel.useSystemFont = true
    this.dangerLabel.fontSize = 48
    this.dangerLabel.color = new Color().fromHEX('#e2a3a3')

    const btn = new Node('DangerButton')
    btn.setParent(this.dangerPanel)
    btn.addComponent(UITransform).setContentSize(320, 100)
    btn.setPosition(0, -50, 0)

    const g = btn.addComponent(Graphics)
    g.fillColor = new Color().fromHEX('#6a4670')
    g.roundRect(-160, -50, 320, 100, 12)
    g.fill()

    const labelNode = new Node('Label')
    labelNode.setParent(btn)
    labelNode.addComponent(UITransform).setContentSize(320, 100)
    const label = labelNode.addComponent(Label)
    label.useSystemFont = true
    label.fontSize = 36
    label.color = new Color().fromHEX('#ffffff')
    label.string = '继续'

    this.dangerButton = btn.addComponent(Button)
  }

  show(input: EncounterInput): Promise<EncounterOutcome> {
    this.currentInput = input
    this.node.active = true

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
    this.harvestRing.clear()

    this.cluesLabel.string = challenge.clues.join('\n')

    this.removeOptionHandlers()

    const buttons = [this.optionAButton, this.optionBButton, this.optionCButton]

    buttons.forEach((btn, i) => {
      btn.node.active = true

      const handler = () => {
        this.handleMushroomChoice(challenge, challenge.options[i], target)
      }
      this.optionHandlers.push(handler)

      btn.node.on(Node.EventType.TOUCH_END, handler, this)
    })

    this.countdownStartTime = Date.now()
    this.schedule(this.updateCountdownRing, 0)

    this.scheduleOnce(() => {
      this.handleMushroomChoice(challenge, '', target)
    }, 3)
  }

  private updateCountdownRing(dt: number): void {
    if (!this.currentInput || this.currentInput.kind !== 'mushroom') return

    const elapsed = (Date.now() - this.countdownStartTime) / 1000
    const progress = Math.min(1, elapsed / 3)

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
    if (this._choiceHandled) return
    this._choiceHandled = true

    this.unschedule(this.updateCountdownRing)
    this.removeOptionHandlers()

    const verdict = judge(challenge, chosenId, Date.now())

    this.optionAButton.node.active = false
    this.optionBButton.node.active = false
    this.optionCButton.node.active = false
    this.timerRing.clear()

    if (verdict === 'correct') {
      this.showMushroomHarvest(target)
    } else {
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
    this.mushroomArtGraphics.clear()

    const capColor = new Color()
    capColor.fromHEX(target.colorCap)
    this.mushroomArtGraphics.fillColor = capColor
    this.mushroomArtGraphics.circle(0, 80, 60)
    this.mushroomArtGraphics.fill()

    const stemColor = new Color()
    stemColor.fromHEX(target.colorStem)
    this.mushroomArtGraphics.fillColor = stemColor
    this.mushroomArtGraphics.rect(-30, -40, 60, 120)
    this.mushroomArtGraphics.fill()

    this.harvestProgress = new HarvestProgress(1500)

    this.mushroomArt.on(Node.EventType.TOUCH_START, this.onHarvestTouchStart, this)
    this.mushroomArt.on(Node.EventType.TOUCH_END, this.onHarvestTouchEnd, this)
    this.mushroomArt.on(Node.EventType.TOUCH_CANCEL, this.onHarvestTouchEnd, this)

    this.schedule(this.updateHarvestProgress, 0)
  }

  private onHarvestTouchStart(): void {
    if (this.harvestProgress) this.harvestProgress.start(Date.now())
  }

  private onHarvestTouchEnd(): void {
    if (this.harvestProgress) this.harvestProgress.release(Date.now())
  }

  private updateHarvestProgress(dt: number): void {
    if (!this.harvestProgress) return

    const progress = this.harvestProgress.tick(Date.now())

    this.harvestRing.clear()
    this.harvestRing.lineWidth = 8
    const color = new Color(100, 200, 100, 255)
    this.harvestRing.strokeColor = color

    const startAngle = -Math.PI / 2
    const endAngle = startAngle + progress * 2 * Math.PI

    this.harvestRing.arc(0, 0, 120, startAngle, endAngle, false)
    this.harvestRing.stroke()

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
    this.unscheduleAllCallbacks()
    this.node.active = false

    if (this.currentResolve) {
      this.currentResolve(outcome)
      this.currentResolve = null
    }

    this.currentInput = null
  }

  onDestroy(): void {
    this.unscheduleAllCallbacks()
    this.removeOptionHandlers()
    this.removeChoiceHandlers()

    if (this.mushroomArt) {
      this.mushroomArt.off(Node.EventType.TOUCH_START, this.onHarvestTouchStart, this)
      this.mushroomArt.off(Node.EventType.TOUCH_END, this.onHarvestTouchEnd, this)
      this.mushroomArt.off(Node.EventType.TOUCH_CANCEL, this.onHarvestTouchEnd, this)
    }
  }
}
