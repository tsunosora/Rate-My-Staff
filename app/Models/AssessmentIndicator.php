<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentIndicator extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'assessment_indicators';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'template_id',
        'category',
        'name',
        'description',
        'weight',
        'sort_order',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'weight' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    /**
     * Get the template this indicator belongs to.
     */
    public function template()
    {
        return $this->belongsTo(AssessmentTemplate::class, 'template_id');
    }

    /**
     * Get scores for this indicator.
     */
    public function scores()
    {
        return $this->hasMany(AssessmentScore::class, 'indicator_id');
    }

    /**
     * Calculate weighted value for a given score.
     */
    public function calculateWeightedValue(int $score): float
    {
        return ($score * $this->weight) / 100;
    }
}
