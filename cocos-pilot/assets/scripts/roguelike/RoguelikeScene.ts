import { _decorator, Component, Node, UITransform, director } from 'cc'
const { ccclass, property } = _decorator

import { RoguelikeGame } from '../../../../js/roguelike/RoguelikeGame.mjs'
import { HABITAT_WARM_MIXED } from '../../../../js/roguelike/speciesAdapter.mjs'
import { RouteMapView, RouteMapEvent } from './RouteMapView'
import { EncounterView } from './EncounterView'
import { SettlementView, SettlementEvent } from './SettlementView'

@ccclass('RoguelikeScene')
export class RoguelikeScene extends Component {
  @property(RouteMapView) routeMap: RouteMapView = null!
  @property(EncounterView) encounter: EncounterView = null!
  @property(SettlementView) settlement: SettlementView = null!

  /**
   * Optional exit handler. When set, "返回主菜单" invokes this instead of
   * loading a scene named 'pilot-menu' (which may not exist in code-driven mode).
   */
  public onExit: (() => void) | null = null

  private game: any = null
  private unsubscribes: (() => void)[] = []

  onLoad(): void {
    if (!this.routeMap || !this.encounter || !this.settlement) {
      this.bootstrapChildren()
    }
  }

  private bootstrapChildren(): void {
    const rootUI = this.node.getComponent(UITransform) ?? this.node.addComponent(UITransform)
    rootUI.setContentSize(750, 1334)

    // RouteMap
    const routeNode = new Node('RouteMap')
    routeNode.setParent(this.node)
    routeNode.addComponent(UITransform).setContentSize(750, 1334)
    this.routeMap = routeNode.addComponent(RouteMapView)

    // Encounter (initially hidden by its own onLoad)
    const encNode = new Node('Encounter')
    encNode.setParent(this.node)
    encNode.addComponent(UITransform).setContentSize(750, 1334)
    this.encounter = encNode.addComponent(EncounterView)

    // Settlement (initially hidden)
    const setNode = new Node('Settlement')
    setNode.setParent(this.node)
    setNode.addComponent(UITransform).setContentSize(750, 1334)
    this.settlement = setNode.addComponent(SettlementView)
    setNode.active = false
  }

  start(): void {
    this.newRun()
  }

  private newRun(): void {
    // Clean up previous run's subscriptions
    this.unsubscribes.forEach(unsub => unsub())
    this.unsubscribes = []

    this.settlement.node.active = false
    this.encounter.node.active = false

    this.game = new (RoguelikeGame as any)({
      habitatId: HABITAT_WARM_MIXED,
      seed: Date.now()
    })

    this.routeMap.setGame(this.game)

    const onNodeSelected = (event: any) => {
      this.onNodeSelected(event.nodeId)
    }
    this.routeMap.events.on(RouteMapEvent.NodeSelected, onNodeSelected)
    this.unsubscribes.push(() => {
      this.routeMap.events.off(RouteMapEvent.NodeSelected, onNodeSelected)
    })

    const onPlayAgain = () => {
      this.newRun()
    }
    this.settlement.events.on(SettlementEvent.PlayAgain, onPlayAgain)
    this.unsubscribes.push(() => {
      this.settlement.events.off(SettlementEvent.PlayAgain, onPlayAgain)
    })

    const onExit = () => {
      if (this.onExit) {
        this.onExit()
      } else {
        // Fallback: try loadScene, but guard against a missing scene
        try {
          director.loadScene('pilot-menu')
        } catch (_) {
          // If no pilot-menu scene exists (e.g. we're an overlay), just destroy self
          this.node.destroy()
        }
      }
    }
    this.settlement.events.on(SettlementEvent.Exit, onExit)
    this.unsubscribes.push(() => {
      this.settlement.events.off(SettlementEvent.Exit, onExit)
    })

    this.unsubscribes.push(
      this.game.on('gameEnded', (payload: any) => {
        this.encounter.node.active = false
        this.settlement.show(payload)
      })
    )
  }

  private async onNodeSelected(nodeId: string): Promise<void> {
    const type = this.game.enterNode(nodeId)

    if (type === 'mushroom') {
      const enc = this.game.makeMushroomEncounter(Date.now())
      const outcome = await this.encounter.show({
        kind: 'mushroom',
        challenge: enc.challenge,
        target: enc.revealTarget
      })
      this.game.applyMushroomOutcome(outcome.target, outcome.verdict)
    } else if (type === 'animal') {
      const outcome = await this.encounter.show({ kind: 'animal' })
      this.game.resolveAnimalNode(outcome.choice)
    } else if (type === 'campfire') {
      const outcome = await this.encounter.show({ kind: 'campfire' })
      this.game.resolveCampfireNode(outcome.choice)
    } else {
      await this.encounter.show({ kind: 'danger' })
      this.game.resolveDangerNode()
    }
  }

  onDestroy(): void {
    this.unsubscribes.forEach(unsub => unsub())
    this.unsubscribes = []
  }
}
