import { _decorator, Component, Node, Graphics, Label, UITransform, EventTarget, Color, Vec3, Sprite, SpriteFrame } from 'cc'
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

  setGame(game: any): void {
    this.game = game

    // Subscribe to game events
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

    // Clear previous render
    this.lineLayer.clear()
    this.nodeLayer.removeAllChildren()

    const route = this.game.route
    const reachable = new Set(this.game.availableNextIds())
    const LAYER_Y = [560, 260, -40, -340, -640] // layer 0 (start) + 4 layers

    // Create a map to store node positions for line drawing
    const nodePositions = new Map<string, { x: number; y: number }>()

    // Render nodes
    for (const routeNode of route.nodes) {
      const y = LAYER_Y[routeNode.layer] ?? 0
      const peers = route.nodes.filter((m: any) => m.layer === routeNode.layer)
      const xStep = 220
      const x = (routeNode.col - (peers.length - 1) / 2) * xStep

      // Store position for line drawing
      nodePositions.set(routeNode.id, { x, y })

      // Create node container
      const nodeContainer = new Node(routeNode.id)
      const transform = nodeContainer.addComponent(UITransform)
      transform.setContentSize(120, 120)
      nodeContainer.setParent(this.nodeLayer)
      nodeContainer.setPosition(x, y, 0)

      // Draw circle background using Graphics
      const graphics = nodeContainer.addComponent(Graphics)
      const isReachable = reachable.has(routeNode.id)

      // Determine color based on node type
      let hexColor = '#6c9560' // default mushroom
      if (routeNode.layer === 0) {
        hexColor = '#d4b356' // gold for start
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

      // Dim if not reachable
      if (!isReachable) {
        color.a = 128
      }

      graphics.fillColor = color
      graphics.circle(0, 0, 60)
      graphics.fill()

      // Add emoji label
      const labelNode = new Node('emoji')
      labelNode.setParent(nodeContainer)
      const label = labelNode.addComponent(Label)
      label.useSystemFont = true
      label.fontSize = 48

      // Determine emoji
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

      // Position label at center
      labelNode.setPosition(0, -10, 0) // Slight offset for better visual centering

      // Make reachable nodes interactive
      if (isReachable) {
        nodeContainer.on(Node.EventType.TOUCH_END, () => {
          this.events.emit(RouteMapEvent.NodeSelected, { nodeId: routeNode.id })
        })
      }
    }

    // Draw lines between connected nodes
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
    // Clean up event subscriptions
    for (const unsub of this.unsubscribes) {
      unsub()
    }
    this.unsubscribes = []
  }
}
