import { _decorator, Component, director } from 'cc'
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

  private game: any = null
  private unsubscribes: (() => void)[] = []

  start(): void {
    this.newRun()
  }

  private newRun(): void {
    // Clean up previous run's subscriptions
    this.unsubscribes.forEach(unsub => unsub())
    this.unsubscribes = []

    // Hide settlement screen
    this.settlement.node.active = false

    // Create new game instance
    this.game = new (RoguelikeGame as any)({
      habitatId: HABITAT_WARM_MIXED,
      seed: Date.now()
    })

    // Set up route map
    this.routeMap.setGame(this.game)

    // Subscribe to node selection
    const onNodeSelected = (event: any) => {
      this.onNodeSelected(event.nodeId)
    }
    this.routeMap.events.on(RouteMapEvent.NodeSelected, onNodeSelected)
    this.unsubscribes.push(() => {
      this.routeMap.events.off(RouteMapEvent.NodeSelected, onNodeSelected)
    })

    // Subscribe to settlement actions
    const onPlayAgain = () => {
      this.newRun()
    }
    this.settlement.events.on(SettlementEvent.PlayAgain, onPlayAgain)
    this.unsubscribes.push(() => {
      this.settlement.events.off(SettlementEvent.PlayAgain, onPlayAgain)
    })

    const onExit = () => {
      director.loadScene('pilot-menu')
    }
    this.settlement.events.on(SettlementEvent.Exit, onExit)
    this.unsubscribes.push(() => {
      this.settlement.events.off(SettlementEvent.Exit, onExit)
    })

    // Subscribe to game end
    this.unsubscribes.push(
      this.game.on('gameEnded', (payload: any) => {
        this.settlement.show(payload)
      })
    )
  }

  private async onNodeSelected(nodeId: string): Promise<void> {
    const type = this.game.enterNode(nodeId)

    if (type === 'mushroom') {
      const enc = this.game.makeMushroomEncounter(performance.now())
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
      // danger node
      await this.encounter.show({ kind: 'danger' })
      this.game.resolveDangerNode()
    }
  }

  onDestroy(): void {
    // Clean up all subscriptions
    this.unsubscribes.forEach(unsub => unsub())
    this.unsubscribes = []
  }
}
