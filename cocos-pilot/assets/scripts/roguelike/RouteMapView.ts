import { _decorator, Component, Node, Graphics, Label, UITransform, EventTarget, Color } from 'cc'
const { ccclass, property } = _decorator

export const RouteMapEvent = { NodeSelected: 'nodeSelected' } as const

@ccclass('RouteMapView')
export class RouteMapView extends Component {
  @property(Graphics) lineLayer: Graphics = null!
  @property(Node) nodeLayer: Node = null!
  @property(Label) hpLabel: Label = null!
  @property(Label) bagLabel: Label = null!

  readonly events = new EventTarget()

  private game: any = null
  private unsubscribes: (() => void)[] = []

  onLoad(): void {
    if (!this.lineLayer || !this.nodeLayer || !this.hpLabel || !this.bagLabel) {
      this.bootstrapUI()
    }
  }

  private bootstrapUI(): void {
    const rootUI = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    rootUI.setContentSize(750, 1334)

    // LineLayer: draws connection lines
    const lineNode = new Node('LineLayer')
    lineNode.setParent(this.node)
    lineNode.addComponent(UITransform).setContentSize(750, 1334)
    this.lineLayer = lineNode.addComponent(Graphics)

    // NodeLayer: holds node buttons
    const nodeLayerNode = new Node('NodeLayer')
    nodeLayerNode.setParent(this.node)
    nodeLayerNode.addComponent(UITransform).setContentSize(750, 1334)
    this.nodeLayer = nodeLayerNode

    // StatsHeader
    const header = new Node('StatsHeader')
    header.setParent(this.node)
    header.addComponent(UITransform).setContentSize(750, 80)
    header.setPosition(0, 620, 0)

    const hpNode = new Node('HPLabel')
    hpNode.setParent(header)
    hpNode.setPosition(-150, 0, 0)
    hpNode.addComponent(UITransform).setContentSize(240, 60)
    this.hpLabel = hpNode.addComponent(Label)
    this.hpLabel.useSystemFont = true
    this.hpLabel.fontSize = 36
    this.hpLabel.color = new Color().fromHEX('#ffffff')

    const bagNode = new Node('BagLabel')
    bagNode.setParent(header)
    bagNode.setPosition(150, 0, 0)
    bagNode.addComponent(UITransform).setContentSize(240, 60)
    this.bagLabel = bagNode.addComponent(Label)
    this.bagLabel.useSystemFont = true
    this.bagLabel.fontSize = 36
    this.bagLabel.color = new Color().fromHEX('#ffffff')
  }

  setGame(game: any): void {
    this.game = game

    this.unsubscribes.push(
      game.on('hpChanged', () => this.refreshStats()),
      game.on('harvested', () => this.refreshStats()),
      game.on('nodeChanged', () => this.render()),
      game.on('gameEnded', () => this.render())
    )

    this.render()
    this.refreshStats()
  }

  private refreshStats(): void {
    if (!this.game) return
    this.hpLabel.string = `❤️ ${this.game.hp}`
    this.bagLabel.string = `🎒 ${this.game.harvested.length}`
  }

  private render(): void {
    if (!this.game) return

    this.lineLayer.clear()
    this.nodeLayer.removeAllChildren()

    const route = this.game.route
    const reachable = new Set(this.game.availableNextIds())
    const LAYER_Y = [560, 260, -40, -340, -640]

    const nodePositions = new Map<string, { x: number; y: number }>()

    for (const routeNode of route.nodes) {
      const y = LAYER_Y[routeNode.layer] ?? 0
      const peers = route.nodes.filter((m: any) => m.layer === routeNode.layer)
      const xStep = 220
      const x = (routeNode.col - (peers.length - 1) / 2) * xStep

      nodePositions.set(routeNode.id, { x, y })

      const nodeContainer = new Node(routeNode.id)
      const transform = nodeContainer.addComponent(UITransform)
      transform.setContentSize(120, 120)
      nodeContainer.setParent(this.nodeLayer)
      nodeContainer.setPosition(x, y, 0)

      const graphics = nodeContainer.addComponent(Graphics)
      const isReachable = reachable.has(routeNode.id)

      let hexColor = '#6c9560'
      if (routeNode.layer === 0) {
        hexColor = '#d4b356'
      } else {
        switch (routeNode.type) {
          case 'mushroom': hexColor = '#6c9560'; break
          case 'animal': hexColor = '#d68a4c'; break
          case 'campfire': hexColor = '#c25a3c'; break
          case 'danger': hexColor = '#6a4670'; break
        }
      }

      const color = new Color()
      color.fromHEX(hexColor)
      if (!isReachable) color.a = 128

      graphics.fillColor = color
      graphics.circle(0, 0, 60)
      graphics.fill()

      const labelNode = new Node('emoji')
      labelNode.setParent(nodeContainer)
      labelNode.addComponent(UITransform).setContentSize(100, 80)
      const label = labelNode.addComponent(Label)
      label.useSystemFont = true
      label.fontSize = 48

      let emoji = '🍄'
      if (routeNode.layer === 0) {
        emoji = '🏁'
      } else {
        switch (routeNode.type) {
          case 'mushroom': emoji = '🍄'; break
          case 'animal': emoji = '🐗'; break
          case 'campfire': emoji = '🔥'; break
          case 'danger': emoji = '⚠️'; break
        }
      }
      label.string = emoji
      labelNode.setPosition(0, -10, 0)

      if (isReachable) {
        nodeContainer.on(Node.EventType.TOUCH_END, () => {
          this.events.emit(RouteMapEvent.NodeSelected, { nodeId: routeNode.id })
        })
      }
    }

    this.lineLayer.lineWidth = 4
    const lineColor = new Color()
    lineColor.fromHEX('#8fa085')
    this.lineLayer.strokeColor = lineColor

    for (const routeNode of route.nodes) {
      const fromPos = nodePositions.get(routeNode.id)
      if (!fromPos) continue

      for (const nextId of routeNode.nextIds) {
        const toPos = nodePositions.get(nextId)
        if (!toPos) continue

        this.lineLayer.moveTo(fromPos.x, fromPos.y)
        this.lineLayer.lineTo(toPos.x, toPos.y)
        this.lineLayer.stroke()
      }
    }
  }

  onDestroy(): void {
    for (const unsub of this.unsubscribes) unsub()
    this.unsubscribes = []
  }
}
