import { _decorator, Component, Node, Label, Button, EventTarget, Graphics, Color, UITransform } from 'cc'
const { ccclass, property } = _decorator

export const SettlementEvent = { PlayAgain: 'playAgain', Exit: 'exit' } as const

@ccclass('SettlementView')
export class SettlementView extends Component {
  @property(Label) summaryLabel: Label = null!
  @property(Node) mushroomList: Node = null!
  @property(Button) playAgainBtn: Button = null!
  @property(Button) exitBtn: Button = null!

  readonly events = new EventTarget()

  onLoad(): void {
    if (!this.summaryLabel || !this.mushroomList || !this.playAgainBtn || !this.exitBtn) {
      this.bootstrapUI()
    }
    // Attach handlers via TOUCH_END so it works whether Button target is wired or not
    this.playAgainBtn.node.on(Node.EventType.TOUCH_END, this.onPlayAgain, this)
    this.exitBtn.node.on(Node.EventType.TOUCH_END, this.onExit, this)
  }

  private bootstrapUI(): void {
    const rootUI = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    rootUI.setContentSize(750, 1334)

    // Full-screen dim background
    const bg = new Node('DimBG')
    bg.setParent(this.node)
    bg.addComponent(UITransform).setContentSize(750, 1334)
    const bgG = bg.addComponent(Graphics)
    bgG.fillColor = new Color(20, 30, 25, 220)
    bgG.rect(-375, -667, 750, 1334)
    bgG.fill()

    // Summary label
    const sumNode = new Node('Summary')
    sumNode.setParent(this.node)
    sumNode.addComponent(UITransform).setContentSize(700, 120)
    sumNode.setPosition(0, 400, 0)
    this.summaryLabel = sumNode.addComponent(Label)
    this.summaryLabel.useSystemFont = true
    this.summaryLabel.fontSize = 44
    this.summaryLabel.color = new Color().fromHEX('#ffffff')

    // Mushroom list container
    const listNode = new Node('MushroomList')
    listNode.setParent(this.node)
    listNode.addComponent(UITransform).setContentSize(700, 140)
    listNode.setPosition(0, 200, 0)
    this.mushroomList = listNode

    // PlayAgain button
    this.playAgainBtn = this.makeButton('PlayAgainBtn', '再玩一局', 0, -100, '#6c9560')
    // Exit button
    this.exitBtn = this.makeButton('ExitBtn', '返回主菜单', 0, -220, '#8b5a4a')
  }

  private makeButton(name: string, text: string, x: number, y: number, hex: string): Button {
    const btn = new Node(name)
    btn.setParent(this.node)
    const ui = btn.addComponent(UITransform)
    ui.setContentSize(340, 80)
    btn.setPosition(x, y, 0)

    const g = btn.addComponent(Graphics)
    g.fillColor = new Color().fromHEX(hex)
    g.roundRect(-170, -40, 340, 80, 12)
    g.fill()

    const labelNode = new Node('Label')
    labelNode.setParent(btn)
    labelNode.addComponent(UITransform).setContentSize(340, 80)
    const label = labelNode.addComponent(Label)
    label.useSystemFont = true
    label.fontSize = 30
    label.color = new Color().fromHEX('#ffffff')
    label.string = text

    return btn.addComponent(Button)
  }

  private onPlayAgain = () => this.events.emit(SettlementEvent.PlayAgain)
  private onExit = () => this.events.emit(SettlementEvent.Exit)

  show(payload: { harvested: any[]; hp: number }): void {
    this.node.active = true
    this.summaryLabel.string = `采到 ${payload.harvested.length} 种菌物，剩余 ❤️${payload.hp}`

    this.mushroomList.removeAllChildren()

    payload.harvested.forEach((card, index) => {
      const thumbnail = new Node(`Mushroom_${card.id}_${index}`)
      thumbnail.layer = this.node.layer
      this.mushroomList.addChild(thumbnail)

      const transform = thumbnail.addComponent(UITransform)
      transform.setContentSize(60, 60)

      thumbnail.setPosition(-((payload.harvested.length - 1) * 40) + index * 80, 0)

      const graphics = thumbnail.addComponent(Graphics)
      const color = new Color()
      color.fromHEX(card.colorCap)
      graphics.fillColor = color
      graphics.circle(0, 0, 25)
      graphics.fill()

      const stemColor = new Color()
      stemColor.fromHEX(card.colorStem)
      graphics.fillColor = stemColor
      graphics.circle(0, 0, 12)
      graphics.fill()
    })
  }

  onDestroy(): void {
    if (this.playAgainBtn?.node) this.playAgainBtn.node.off(Node.EventType.TOUCH_END, this.onPlayAgain, this)
    if (this.exitBtn?.node) this.exitBtn.node.off(Node.EventType.TOUCH_END, this.onExit, this)
  }
}
