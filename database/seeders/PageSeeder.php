<?php

namespace Database\Seeders;

use App\Models\Page;
use Illuminate\Database\Seeder;

class PageSeeder extends Seeder
{
    public function run(): void
    {
        Page::firstOrCreate(['slug' => 'home'], ['title' => 'Home', 'draft_content' => ['root' => ['props' => []], 'content' => [['type' => 'Hero', 'props' => ['id' => 'welcome-hero', 'title' => 'Your next chapter starts here.', 'text' => 'Build something worth sharing. Make this space your own.']]]]]);
    }
}
