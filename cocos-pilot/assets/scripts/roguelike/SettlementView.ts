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

  show(payload: { harvested: any[]; hp: number }): void {
    this.node.active = true
    this.summaryLabel.string = `采到 ${payload.harvested.length} 种菌物，剩余 ❤️${payload.hp}`

    // Clear previous mushroom thumbnails
    this.mushroomList.removeAllChildren()

    // Create a thumbnail for each harvested mushroom
    payload.harvested.forEach((card, index) => {
      const thumbnail = new Node(`Mushroom_${card.id}`)
      thumbnail.layer = this.node.layer
      this.mushroomList.addChild(thumbnail)

      const transform = thumbnail.addComponent(UITransform)
      transform.setContentSize(60, 60)

      // Position horizontally with spacing
      thumbnail.setPosition(-((payload.harvested.length - 1) * 40) + index * 80, 0)

      // Draw a colored circle representing the mushroom cap
      const graphics = thumbnail.addComponent(Graphics)
      const color = new Color()
      color.fromHEX(card.colorCap)
      graphics.fillColor = color
      graphics.circle(0, 0, 25)
      graphics.fill()

      // Draw stem color as inner circle
      const stemColor = new Color()
      stemColor.fromHEX(card.colorStem)
      graphics.fillColor = stemColor
      graphics.circle(0, 0, 12)
      graphics.fill()
    })
  }

  onLoad(): void {
    this.playAgainBtn.node.on(Button.EventType.CLICK, () => {
      this.events.emit(SettlementEvent.PlayAgain)
    })

    this.exitBtn.node.on(Button.EventType.CLICK, () => {
      this.events.emit(SettlementEvent.Exit)
    })
  }

  onDestroy(): void {
    // Button cleanup handled by Cocos
  }
}
