import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';

const routes: Routes = [
  {
    path: '',
    redirectTo: 'pokemon-list',
    pathMatch: 'full'
  },
  {
    path: 'pokemon-list',
    loadChildren: () => import('./pages/pokemon-list/pokemon-list.module').then( m => m.PokemonListPageModule)
  },
  {
    path: 'home',
    redirectTo: 'pokemon-list',
    pathMatch: 'full'
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })
  ],
  exports: [RouterModule]
})
export class AppRoutingModule { }
