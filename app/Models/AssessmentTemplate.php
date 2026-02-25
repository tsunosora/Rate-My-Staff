<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentTemplate extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'description',
        'department_type',
        'is_active',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'is_active' => 'boolean',
    ];

    /**
     * Get indicators for this template.
     */
    public function indicators()
    {
        return $this->hasMany(AssessmentIndicator::class, 'template_id')->orderBy('sort_order');
    }

    /**
     * Get assessments using this template.
     */
    public function assessments()
    {
        return $this->hasMany(Assessment::class, 'template_id');
    }

    /**
     * Get total weight of all indicators.
     */
    public function getTotalWeightAttribute(): float
    {
        return $this->indicators->sum('weight');
    }

    /**
     * Scope for active templates.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}
