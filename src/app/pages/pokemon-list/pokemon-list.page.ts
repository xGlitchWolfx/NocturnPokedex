import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { IonContent } from '@ionic/angular';
import { Pokemon, PokemonListItem, PokemonProfile, PokemonStat, PokemonWeakness } from '../../services/pokemon';

@Component({
  selector: 'app-pokemon-list',
  templateUrl: './pokemon-list.page.html',
  styleUrls: ['./pokemon-list.page.scss'],
  standalone: false,
})
export class PokemonListPage implements OnInit {
  @ViewChild(IonContent) content?: IonContent;
  @ViewChild('detailPanel') detailPanel?: ElementRef<HTMLElement>;

  readonly typeStyles: Record<string, { label: string; color: string; glow: string }> = {
    normal: { label: 'Normal', color: '#9fa19f', glow: 'rgba(159, 161, 159, 0.28)' },
    fire: { label: 'Fuego', color: '#ff7b52', glow: 'rgba(255, 123, 82, 0.28)' },
    water: { label: 'Agua', color: '#4f9dff', glow: 'rgba(79, 157, 255, 0.28)' },
    electric: { label: 'Electrico', color: '#ffd84f', glow: 'rgba(255, 216, 79, 0.26)' },
    grass: { label: 'Planta', color: '#56cf7b', glow: 'rgba(86, 207, 123, 0.28)' },
    ice: { label: 'Hielo', color: '#7ce8ff', glow: 'rgba(124, 232, 255, 0.28)' },
    fighting: { label: 'Lucha', color: '#d96b5f', glow: 'rgba(217, 107, 95, 0.28)' },
    poison: { label: 'Veneno', color: '#b06bd7', glow: 'rgba(176, 107, 215, 0.28)' },
    ground: { label: 'Tierra', color: '#c79b5a', glow: 'rgba(199, 155, 90, 0.28)' },
    flying: { label: 'Volador', color: '#8ba8ff', glow: 'rgba(139, 168, 255, 0.28)' },
    psychic: { label: 'Psiquico', color: '#ff6ea9', glow: 'rgba(255, 110, 169, 0.28)' },
    bug: { label: 'Bicho', color: '#9fc94a', glow: 'rgba(159, 201, 74, 0.28)' },
    rock: { label: 'Roca', color: '#b69d5d', glow: 'rgba(182, 157, 93, 0.28)' },
    ghost: { label: 'Fantasma', color: '#7b71d9', glow: 'rgba(123, 113, 217, 0.28)' },
    dragon: { label: 'Dragon', color: '#6f7cff', glow: 'rgba(111, 124, 255, 0.28)' },
    dark: { label: 'Siniestro', color: '#6f625d', glow: 'rgba(111, 98, 93, 0.28)' },
    steel: { label: 'Acero', color: '#86a5b7', glow: 'rgba(134, 165, 183, 0.28)' },
    fairy: { label: 'Hada', color: '#f59ad0', glow: 'rgba(245, 154, 208, 0.28)' },
  };
  generations: PokemonGeneration[] = [
    { id: 1, label: 'Primera generacion', startId: 1, endId: 151 },
    { id: 2, label: 'Segunda generacion', startId: 152, endId: 251 },
    { id: 3, label: 'Tercera generacion', startId: 252, endId: 386 },
    { id: 4, label: 'Cuarta generacion', startId: 387, endId: 493 },
    { id: 5, label: 'Quinta generacion', startId: 494, endId: 649 },
    { id: 6, label: 'Sexta generacion', startId: 650, endId: 721 },
    { id: 7, label: 'Septima generacion', startId: 722, endId: 809 },
    { id: 8, label: 'Octava generacion', startId: 810, endId: 905 },
    { id: 9, label: 'Novena generacion', startId: 906, endId: 1025 },
  ];
  allPokemon: PokemonListItem[] = [];
  allPokemonGlobal: PokemonListItem[] = [];
  filteredPokemon: PokemonListItem[] = [];
  selectedPokemon: PokemonProfile | null = null;
  selectedGenerationId = 1;
  pendingSelectedPokemonId: number | null = null;
  searchTerm = '';
  isLoadingList = true;
  isLoadingDetail = false;
  errorMessage = '';

  constructor(private readonly pokemonService: Pokemon) {}

  ngOnInit() {
    this.loadGlobalPokemonDirectory();
    this.loadPokemonDirectory();
  }

  loadPokemonDirectory(event?: CustomEvent): void {
    const generation = this.currentGeneration();
    this.isLoadingList = true;
    this.errorMessage = '';

    this.pokemonService.getPokemonDirectoryRange(generation.startId, generation.endId).subscribe({
      next: (pokemon) => {
        this.allPokemon = pokemon;
        this.applyFilter();

        if (this.pendingSelectedPokemonId) {
          const pendingPokemon = pokemon.find((entry) => entry.id === this.pendingSelectedPokemonId);

          if (pendingPokemon) {
            this.pendingSelectedPokemonId = null;
            this.loadPokemonDetail(pendingPokemon);
          } else if (pokemon.length > 0) {
            this.selectedPokemon = null;
            this.pendingSelectedPokemonId = null;
          }
        } else {
          this.selectedPokemon = null;
        }

        this.isLoadingList = false;
        this.completeRefresh(event);
      },
      error: () => {
        this.errorMessage = 'No se pudo cargar la PokeAPI. Verifica tu conexion e intenta otra vez.';
        this.isLoadingList = false;
        this.completeRefresh(event);
      },
    });
  }

  onGenerationChange(generationId: number): void {
    if (generationId === this.selectedGenerationId) {
      return;
    }

    this.selectedGenerationId = generationId;
    this.loadPokemonDirectory();
  }

  applyFilter(): void {
    const normalized = this.searchTerm.trim().toLowerCase();
    const source = normalized ? this.allPokemonGlobal : this.allPokemon;

    this.filteredPokemon = source.filter((pokemon) =>
      pokemon.name.toLowerCase().includes(normalized) || pokemon.id.toString().includes(normalized),
    );
  }

  loadPokemonDetail(pokemon: PokemonListItem): void {
    const wasSearching = this.isGlobalSearchActive();
    const pokemonGeneration = this.findGenerationByPokemonId(pokemon.id);

    if (pokemonGeneration && pokemonGeneration.id !== this.selectedGenerationId) {
      this.pendingSelectedPokemonId = pokemon.id;
      this.selectedGenerationId = pokemonGeneration.id;
      if (wasSearching) {
        this.searchTerm = '';
      }
      this.loadPokemonDirectory();
      return;
    }

    if (wasSearching) {
      this.searchTerm = '';
      this.applyFilter();
    }

    this.isLoadingDetail = true;
    this.pendingSelectedPokemonId = null;

    this.pokemonService.getPokemonProfile(pokemon.id).subscribe({
      next: (profile) => {
        this.selectedPokemon = profile;
        this.isLoadingDetail = false;
        this.scrollToDetailPanel();
      },
      error: () => {
        this.errorMessage = `No se pudieron cargar los datos de ${this.formatName(pokemon.name)}.`;
        this.isLoadingDetail = false;
      },
    });
  }

  formatName(value: string): string {
    return value
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  formatTypeName(type: string): string {
    return this.typeStyles[type]?.label ?? this.formatName(type);
  }

  formatStatName(statName: string): string {
    return statName
      .replace('special-attack', 'ataque especial')
      .replace('special-defense', 'defensa especial')
      .replace('attack', 'ataque')
      .replace('defense', 'defensa')
      .replace('speed', 'velocidad')
      .replace('hp', 'vida');
  }

  formatWeaknessMultiplier(multiplier: number): string {
    return `${multiplier}x`;
  }

  getTypeStyle(type: string): Record<string, string> {
    const palette = this.typeStyles[type] ?? {
      color: '#77f0a3',
      glow: 'rgba(119, 240, 163, 0.24)',
    };

    return {
      '--type-color': palette.color,
      '--type-glow': palette.glow,
    };
  }

  visibleMoves(pokemon: PokemonProfile): string[] {
    return [...pokemon.moves].sort((left, right) => left.localeCompare(right));
  }

  statPercent(stat: PokemonStat): number {
    return Math.min(100, Math.round((stat.value / 180) * 100));
  }

  totalStats(): number {
    return this.selectedPokemon?.stats.reduce((total, stat) => total + stat.value, 0) ?? 0;
  }

  currentGeneration(): PokemonGeneration {
    return this.generations.find((generation) => generation.id === this.selectedGenerationId) ?? this.generations[0];
  }

  currentGenerationCount(): number {
    const generation = this.currentGeneration();
    return generation.endId - generation.startId + 1;
  }

  private findGenerationByPokemonId(pokemonId: number): PokemonGeneration | undefined {
    return this.generations.find((generation) => pokemonId >= generation.startId && pokemonId <= generation.endId);
  }

  visiblePokemonCount(): number {
    return this.filteredPokemon.length;
  }

  isGlobalSearchActive(): boolean {
    return this.searchTerm.trim().length > 0;
  }

  trackByWeakness(_: number, weakness: PokemonWeakness): string {
    return weakness.type;
  }

  trackByMove(_: number, move: string): string {
    return move;
  }

  trackByPokemon(_: number, pokemon: PokemonListItem): number {
    return pokemon.id;
  }

  private completeRefresh(event?: CustomEvent): void {
    const refresher = event?.target as HTMLIonRefresherElement | undefined;
    refresher?.complete();
  }

  private loadGlobalPokemonDirectory(): void {
    this.pokemonService.getAllPokemonDirectory().subscribe({
      next: (pokemon) => {
        this.allPokemonGlobal = pokemon;
        this.applyFilter();
      },
      error: () => {
        if (!this.errorMessage) {
          this.errorMessage = 'No se pudo cargar el indice global de Pokemon.';
        }
      },
    });
  }

  private scrollToDetailPanel(): void {
    requestAnimationFrame(async () => {
      const detailElement = this.detailPanel?.nativeElement;

      if (!detailElement || !this.content) {
        return;
      }

      const contentElement = await this.content.getScrollElement();
      const detailTop = detailElement.getBoundingClientRect().top;
      const contentTop = contentElement.getBoundingClientRect().top;
      const targetTop = contentElement.scrollTop + detailTop - contentTop - 200;

      await this.content.scrollToPoint(0, Math.max(0, targetTop), 500);
    });
  }
}

interface PokemonGeneration {
  id: number;
  label: string;
  startId: number;
  endId: number;
}
