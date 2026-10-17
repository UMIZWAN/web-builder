<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Validator;

class CreateAdmin extends Command
{
    protected $signature = 'app:create-admin {email} {--name=Administrator}';

    protected $description = 'Create an administrator account with a securely prompted password';

    public function handle(): int
    {
        $password = $this->secret('Password (at least 12 characters)');
        $data = ['email' => $this->argument('email'), 'name' => $this->option('name'), 'password' => $password];
        $validator = Validator::make($data, ['email' => 'required|email|unique:users,email', 'name' => 'required|string|max:255', 'password' => 'required|string|min:12']);
        if ($validator->fails()) {
            $this->error($validator->errors()->first());

            return self::FAILURE;
        }
        User::create($data);
        $this->info('Administrator created. Sign in at /login.');

        return self::SUCCESS;
    }
}
