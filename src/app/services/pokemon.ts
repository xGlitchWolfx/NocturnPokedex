import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class Pokemon {
  private readonly apiUrl = 'https://pokeapi.co/api/v2';

  constructor(private readonly http: HttpClient) {}

  getPokemonDirectoryRange(startId: number, endId: number): Observable<PokemonListItem[]> {
    const offset = startId - 1;
    const limit = endId - startId + 1;

    return this.http
      .get<PokemonListResponse>(`${this.apiUrl}/pokemon?offset=${offset}&limit=${limit}`)
      .pipe(
        map((response) =>
          response.results.map((entry) => {
            const id = this.extractIdFromUrl(entry.url);

            return {
              id,
              name: entry.name,
              image: this.buildArtworkUrl(id),
            };
          }),
        ),
      );
  }

  getAllPokemonDirectory(): Observable<PokemonListItem[]> {
    return this.getPokemonDirectoryRange(1, 1025);
  }

  getPokemonProfile(nameOrId: string | number): Observable<PokemonProfile> {
    return forkJoin({
      detail: this.http.get<PokemonDetailResponse>(`${this.apiUrl}/pokemon/${nameOrId}`),
      species: this.http.get<PokemonSpeciesResponse>(`${this.apiUrl}/pokemon-species/${nameOrId}`),
    }).pipe(
      map(({ detail, species }) => ({
        detail,
        species,
        typeNames: detail.types.map((type) => type.type.name),
      })),
      switchMap(({ detail, species, typeNames }) =>
        forkJoin(typeNames.map((typeName) => this.http.get<PokemonTypeResponse>(`${this.apiUrl}/type/${typeName}`))).pipe(
          map((types) => ({
            id: detail.id,
            name: detail.name,
            image: detail.sprites.other['official-artwork'].front_default || this.buildArtworkUrl(detail.id),
            types: typeNames,
            height: detail.height / 10,
            weight: detail.weight / 10,
            abilities: detail.abilities.map((ability) => ({
              name: ability.ability.name,
              hidden: ability.is_hidden,
            })),
            moves: detail.moves.map((move) => move.move.name),
            stats: detail.stats.map((stat) => ({
              name: stat.stat.name,
              value: stat.base_stat,
            })),
            weaknesses: this.calculateWeaknesses(typeNames, types),
            flavorText: this.getSpanishFlavorText(species),
            genus: this.getSpanishGenus(species),
            habitat: species.habitat?.name ?? null,
            captureRate: species.capture_rate,
            baseHappiness: species.base_happiness,
          })),
        ),
      ),
    );
  }

  private extractIdFromUrl(url: string): number {
    const parts = url.split('/').filter(Boolean);
    return Number(parts[parts.length - 1]);
  }

  private buildArtworkUrl(id: number): string {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  }

  private getSpanishFlavorText(species: PokemonSpeciesResponse): string {
    const spanishEntry = species.flavor_text_entries.find((entry) => entry.language.name === 'es');
    const fallbackEntry = species.flavor_text_entries.find((entry) => entry.language.name === 'en');
    const entry = spanishEntry ?? fallbackEntry;

    return entry ? entry.flavor_text.replace(/\f|\n|\r/g, ' ') : 'Descripcion no disponible.';
  }

  private getSpanishGenus(species: PokemonSpeciesResponse): string {
    const spanishGenus = species.genera.find((entry) => entry.language.name === 'es');
    const fallbackGenus = species.genera.find((entry) => entry.language.name === 'en');
    return spanishGenus?.genus ?? fallbackGenus?.genus ?? 'Pokemon';
  }

  private calculateWeaknesses(typeNames: string[], types: PokemonTypeResponse[]): PokemonWeakness[] {
    const multipliers = new Map<string, number>();

    for (const attackingType of POKEMON_TYPES) {
      multipliers.set(attackingType, 1);
    }

    for (const defendingType of typeNames) {
      const typeInfo = types.find((entry) => entry.name === defendingType);

      if (!typeInfo) {
        continue;
      }

      for (const type of typeInfo.damage_relations.double_damage_from) {
        multipliers.set(type.name, (multipliers.get(type.name) ?? 1) * 2);
      }

      for (const type of typeInfo.damage_relations.half_damage_from) {
        multipliers.set(type.name, (multipliers.get(type.name) ?? 1) * 0.5);
      }

      for (const type of typeInfo.damage_relations.no_damage_from) {
        multipliers.set(type.name, 0);
      }
    }

    return Array.from(multipliers.entries())
      .filter(([, multiplier]) => multiplier > 1)
      .sort((left, right) => right[1] - left[1])
      .map(([type, multiplier]) => ({
        type,
        multiplier,
      }));
  }
}

export interface PokemonListItem {
  id: number;
  name: string;
  image: string;
}

export interface PokemonProfile {
  id: number;
  name: string;
  image: string;
  types: string[];
  height: number;
  weight: number;
  abilities: PokemonAbility[];
  moves: string[];
  stats: PokemonStat[];
  weaknesses: PokemonWeakness[];
  flavorText: string;
  genus: string;
  habitat: string | null;
  captureRate: number;
  baseHappiness: number;
}

export interface PokemonAbility {
  name: string;
  hidden: boolean;
}

export interface PokemonStat {
  name: string;
  value: number;
}

export interface PokemonWeakness {
  type: string;
  multiplier: number;
}

interface PokemonListResponse {
  results: Array<{
    name: string;
    url: string;
  }>;
}

interface PokemonDetailResponse {
  id: number;
  name: string;
  height: number;
  weight: number;
  abilities: Array<{
    is_hidden: boolean;
    ability: {
      name: string;
    };
  }>;
  stats: Array<{
    base_stat: number;
    stat: {
      name: string;
    };
  }>;
  moves: Array<{
    move: {
      name: string;
    };
  }>;
  types: Array<{
    type: {
      name: string;
    };
  }>;
  sprites: {
    other: {
      'official-artwork': {
        front_default: string | null;
      };
    };
  };
}

interface PokemonSpeciesResponse {
  base_happiness: number;
  capture_rate: number;
  habitat: {
    name: string;
  } | null;
  flavor_text_entries: Array<{
    flavor_text: string;
    language: {
      name: string;
    };
  }>;
  genera: Array<{
    genus: string;
    language: {
      name: string;
    };
  }>;
}

interface PokemonTypeResponse {
  name: string;
  damage_relations: {
    double_damage_from: NamedType[];
    half_damage_from: NamedType[];
    no_damage_from: NamedType[];
  };
}

interface NamedType {
  name: string;
}

const POKEMON_TYPES = [
  'normal',
  'fire',
  'water',
  'electric',
  'grass',
  'ice',
  'fighting',
  'poison',
  'ground',
  'flying',
  'psychic',
  'bug',
  'rock',
  'ghost',
  'dragon',
  'dark',
  'steel',
  'fairy',
];
