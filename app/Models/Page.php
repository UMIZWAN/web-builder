<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Page extends Model
{
    use HasFactory;

    protected $fillable = ['title', 'slug', 'position', 'draft_content', 'published_content', 'published_at'];

    protected function casts(): array
    {
        return ['draft_content' => 'array', 'published_content' => 'array', 'published_at' => 'datetime'];
    }
}
