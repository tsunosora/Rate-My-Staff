<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssessmentScore extends Model
{
    use HasFactory;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'assessment_scores';

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'assessment_id',
        'indicator_id',
        'score',
        'weighted_value',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'score' => 'integer',
        'weighted_value' => 'decimal:2',
    ];

    /**
     * Get the assessment this score belongs to.
     */
    public function assessment()
    {
        return $this->belongsTo(Assessment::class);
    }

    /**
     * Get the indicator this score is for.
     */
    public function indicator()
    {
        return $this->belongsTo(AssessmentIndicator::class, 'indicator_id');
    }

    /**
     * Calculate weighted value based on score and indicator weight.
     */
    public function calculateWeightedValue(): float
    {
        $indicator = $this->indicator;
        if (!$indicator) {
            return 0;
        }
        return ($this->score * $indicator->weight) / 100;
    }

    /**
     * Boot the model.
     */
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($score) {
            $score->weighted_value = $score->calculateWeightedValue();
        });
    }
}
