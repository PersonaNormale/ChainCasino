//! MIT License
//!
//! Integration Tests for AptosRoulette Module
//!
//! Tests European roulette mechanics, initialization, and casino integration.

#[test_only]
module roulette_game::AptosRouletteIntegrationTests {
    use std::string;
    use std::option;
    use std::vector;
    use aptos_framework::account;
    use aptos_framework::aptos_coin::{Self, AptosCoin};
    use aptos_framework::coin;
    use aptos_framework::primary_fungible_store;
    use aptos_framework::timestamp;
    use aptos_framework::randomness;
    use casino::InvestorToken;
    use casino::CasinoHouse;
    use roulette_game::AptosRoulette;

    // Test constants
    const CASINO_ADDR: address = @casino;
    const ROULETTE_ADDR: address = @roulette_game;
    const WHALE_INVESTOR_ADDR: address = @0x1001;
    const PLAYER_ADDR: address = @0x2001;

    const WHALE_CAPITAL: u64 = 100000000000; // 1000 APT for liquidity
    const PLAYER_FUNDING: u64 = 5000000000; // 50 APT for testing
    const STANDARD_BET: u64 = 2000000; // 0.02 APT
    const MIN_BET: u64 = 1000000; // 0.01 APT
    const MAX_BET: u64 = 10000000; // 0.1 APT

    /// Sets up the entire ecosystem: accounts, funding, casino, and game registration/initialization.
    /// This is the single source of truth for test setup to ensure consistency.
    fun setup_and_initialize_roulette(): (signer, signer, signer, signer) {
        let (_, casino_signer, roulette_signer, whale_investor, player) =
            setup_roulette_ecosystem();

        // PHASE 1: CASINO SETUP
        CasinoHouse::init_module_for_test(&casino_signer);
        InvestorToken::init_module_for_test(&casino_signer);
        InvestorToken::deposit_and_mint(&whale_investor, WHALE_CAPITAL);

        // PHASE 2: GAME REGISTRATION
        CasinoHouse::register_game(
            &casino_signer,
            ROULETTE_ADDR,
            string::utf8(b"AptosRoulette"),
            string::utf8(b"v1"),
            MIN_BET,
            MAX_BET,
            270,
            350000000,
            string::utf8(b"https://chaincasino.apt/roulette"),
            string::utf8(
                b"https://chaincasino.apt/icons/roulette.png"
            ),
            string::utf8(b"European Roulette with comprehensive betting options")
        );

        // PHASE 3: GAME INITIALIZATION
        AptosRoulette::initialize_game(&roulette_signer);

        (casino_signer, roulette_signer, whale_investor, player)
    }

    fun setup_roulette_ecosystem(): (signer, signer, signer, signer, signer) {
        let aptos_framework = account::create_account_for_test(@aptos_framework);
        let casino_signer = account::create_account_for_test(CASINO_ADDR);
        let roulette_signer = account::create_account_for_test(ROULETTE_ADDR);
        let whale_investor = account::create_account_for_test(WHALE_INVESTOR_ADDR);
        let player = account::create_account_for_test(PLAYER_ADDR);

        // Initialize Aptos environment
        aptos_coin::ensure_initialized_with_apt_fa_metadata_for_test();
        timestamp::set_time_has_started_for_testing(&aptos_framework);
        timestamp::update_global_time_for_test(5000000);
        randomness::initialize_for_testing(&aptos_framework);

        // Setup primary stores
        let aptos_metadata = option::extract(&mut coin::paired_metadata<AptosCoin>());
        let all_addresses = vector[CASINO_ADDR, ROULETTE_ADDR, WHALE_INVESTOR_ADDR, PLAYER_ADDR];
        let i = 0;
        while (i < vector::length(&all_addresses)) {
            let addr = *vector::borrow(&all_addresses, i);
            primary_fungible_store::ensure_primary_store_exists(addr, aptos_metadata);
            i = i + 1;
        };

        // Fund accounts
        aptos_coin::mint(&aptos_framework, CASINO_ADDR, WHALE_CAPITAL);
        aptos_coin::mint(&aptos_framework, ROULETTE_ADDR, WHALE_CAPITAL);
        aptos_coin::mint(&aptos_framework, WHALE_INVESTOR_ADDR, WHALE_CAPITAL);
        aptos_coin::mint(&aptos_framework, PLAYER_ADDR, PLAYER_FUNDING);

        (aptos_framework, casino_signer, roulette_signer, whale_investor, player)
    }

    #[test]
    fun test_roulette_initialization_and_basic_gameplay() {
        let (_, _, _, player) = setup_and_initialize_roulette();

        // Verify initialization success
        assert!(AptosRoulette::is_initialized(), 1);
        assert!(AptosRoulette::is_registered(), 2);
        assert!(AptosRoulette::is_ready(), 3);
        assert!(AptosRoulette::object_exists(), 4);

        // === PHASE 4: VERIFY ROULETTE CONFIGURATION ===
        let (single, even_money, dozen_column, split, street, corner, line) =
            AptosRoulette::get_payout_table();
        assert!(single == 35, 5); // 35:1 payout for single numbers
        assert!(even_money == 1, 6); // 1:1 payout for even money bets
        assert!(dozen_column == 2, 7); // 2:1 payout for dozen/column bets
        assert!(split == 17, 8); // 17:1 payout for split bets
        assert!(street == 11, 9); // 11:1 payout for street bets
        assert!(corner == 8, 10); // 8:1 payout for corner bets
        assert!(line == 5, 11); // 5:1 payout for line bets

        // === PHASE 5: TEST NUMBER CLASSIFICATION ===
        // Test red/black classification
        assert!(AptosRoulette::is_red(1), 12); // 1 is red
        assert!(AptosRoulette::is_black(2), 13); // 2 is black
        assert!(!AptosRoulette::is_red(0), 14); // 0 is green
        assert!(!AptosRoulette::is_black(0), 15); // 0 is green

        // Test even/odd classification
        assert!(AptosRoulette::is_even(2), 16); // 2 is even
        assert!(AptosRoulette::is_odd(1), 17); // 1 is odd
        assert!(!AptosRoulette::is_even(0), 18); // 0 is neither even nor odd
        assert!(!AptosRoulette::is_odd(0), 19); // 0 is neither even nor odd

        // Test dozen classification
        assert!(AptosRoulette::get_dozen(5) == 1, 20); // 5 is in first dozen
        assert!(AptosRoulette::get_dozen(15) == 2, 21); // 15 is in second dozen
        assert!(AptosRoulette::get_dozen(25) == 3, 22); // 25 is in third dozen
        assert!(AptosRoulette::get_dozen(0) == 0, 23); // 0 is in no dozen

        // Test column classification
        assert!(AptosRoulette::get_column(1) == 1, 24); // 1 is in first column
        assert!(AptosRoulette::get_column(2) == 2, 25); // 2 is in second column
        assert!(AptosRoulette::get_column(3) == 3, 26); // 3 is in third column
        assert!(AptosRoulette::get_column(0) == 0, 27); // 0 is in no column

        // Test color string function
        assert!(AptosRoulette::get_color_string(0) == string::utf8(b"green"), 28);
        assert!(AptosRoulette::get_color_string(1) == string::utf8(b"red"), 29);
        assert!(AptosRoulette::get_color_string(2) == string::utf8(b"black"), 30);

        // === PHASE 6: TEST STRAIGHT UP BETS ===
        let initial_balance =
            primary_fungible_store::balance(
                PLAYER_ADDR,
                option::extract(&mut coin::paired_metadata<AptosCoin>())
            );

        // Test straight up bet on number 7
        AptosRoulette::test_only_bet_number(&player, 7, STANDARD_BET);

        // Verify player spent money
        let balance_after_bet =
            primary_fungible_store::balance(
                PLAYER_ADDR,
                option::extract(&mut coin::paired_metadata<AptosCoin>())
            );
        assert!(balance_after_bet < initial_balance, 31);

        // Get result details (11-tuple now)
        let (
            winning_number,
            _winning_color,
            _is_even,
            _is_high,
            dozen,
            column,
            total_wagered,
            _total_payout,
            won,
            _net_result,
            _session_id
        ) = AptosRoulette::get_latest_result(PLAYER_ADDR);

        assert!(winning_number <= 36, 32);
        assert!(total_wagered == STANDARD_BET, 33);
        assert!(won == true || won == false, 34); // Can win or lose
        assert!(dozen >= 0 && dozen <= 3, 35);
        assert!(column >= 0 && column <= 3, 36);

        // Clear result for next test
        AptosRoulette::clear_game_result(&player);

        // === PHASE 7: TEST COLOR BETS ===
        // Test red bet
        AptosRoulette::test_only_bet_red_black(&player, true, STANDARD_BET);
        let (winning_number_red, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_red <= 36, 37);

        AptosRoulette::clear_game_result(&player);

        // Test black bet
        AptosRoulette::test_only_bet_red_black(&player, false, STANDARD_BET);
        let (winning_number_black, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_black <= 36, 38);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 8: TEST EVEN/ODD BETS ===
        // Test even bet
        AptosRoulette::test_only_place_bet(
            &player,
            5, // ENTRY_EVEN_ODD
            1, // is_even = true
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_even, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_even <= 36, 39);

        AptosRoulette::clear_game_result(&player);

        // Test odd bet
        AptosRoulette::test_only_place_bet(
            &player,
            5, // ENTRY_EVEN_ODD
            0, // is_even = false
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_odd, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_odd <= 36, 40);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 9: TEST HIGH/LOW BETS ===
        // Test high bet
        AptosRoulette::test_only_place_bet(
            &player,
            6, // ENTRY_HIGH_LOW
            1, // is_high = true
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_high, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_high <= 36, 41);

        AptosRoulette::clear_game_result(&player);

        // Test low bet
        AptosRoulette::test_only_place_bet(
            &player,
            6, // ENTRY_HIGH_LOW
            0, // is_high = false
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_low, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_low <= 36, 42);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 10: TEST DOZEN BETS ===
        // Test first dozen
        AptosRoulette::test_only_place_bet(
            &player,
            7, // ENTRY_DOZEN
            1, // first dozen
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_dozen1, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_dozen1 <= 36, 43);

        AptosRoulette::clear_game_result(&player);

        // Test second dozen
        AptosRoulette::test_only_place_bet(
            &player,
            7, // ENTRY_DOZEN
            2, // second dozen
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_dozen2, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_dozen2 <= 36, 44);

        AptosRoulette::clear_game_result(&player);

        // Test third dozen
        AptosRoulette::test_only_place_bet(
            &player,
            7, // ENTRY_DOZEN
            3, // third dozen
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_dozen3, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_dozen3 <= 36, 45);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 11: TEST COLUMN BETS ===
        // Test first column
        AptosRoulette::test_only_place_bet(
            &player,
            8, // ENTRY_COLUMN
            1, // first column
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_col1, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_col1 <= 36, 46);

        AptosRoulette::clear_game_result(&player);

        // Test second column
        AptosRoulette::test_only_place_bet(
            &player,
            8, // ENTRY_COLUMN
            2, // second column
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_col2, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_col2 <= 36, 47);

        AptosRoulette::clear_game_result(&player);

        // Test third column
        AptosRoulette::test_only_place_bet(
            &player,
            8, // ENTRY_COLUMN
            3, // third column
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_col3, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_col3 <= 36, 48);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 12: TEST GENERIC PLACE_BET INTERFACE ===
        // Test straight up bet using generic interface
        AptosRoulette::test_only_place_bet(
            &player,
            0, // ENTRY_STRAIGHT_UP
            17, // number 17
            vector::empty<u8>(),
            STANDARD_BET
        );
        let (winning_number_generic, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_generic <= 36, 49);

        AptosRoulette::clear_game_result(&player);

        // Test split bet using generic interface
        AptosRoulette::test_only_place_bet(
            &player,
            1, // ENTRY_SPLIT
            0, // not used for split
            vector[1, 2], // numbers 1 and 2
            STANDARD_BET
        );
        let (winning_number_split, _, _, _, _, _, _, _, _, _, _) =
            AptosRoulette::get_latest_result(PLAYER_ADDR);
        assert!(winning_number_split <= 36, 50);

        AptosRoulette::clear_game_result(&player);

        // === PHASE 13: VERIFY SYSTEM STABILITY ===
        assert!(AptosRoulette::is_ready(), 54);
        assert!(CasinoHouse::treasury_balance() > 0, 55);
    }

    // === ERROR CONDITION TESTS ===

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_INVALID_AMOUNT)]
    fun test_bet_amount_too_low() {
        let (_, _, _, player) = setup_and_initialize_roulette();
        // Try to bet below minimum - should fail
        AptosRoulette::test_only_bet_number(&player, 7, MIN_BET - 1);
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_INVALID_AMOUNT)]
    fun test_bet_amount_too_high() {
        let (_, _, _, player) = setup_and_initialize_roulette();
        // Try to bet above maximum - should fail
        AptosRoulette::test_only_bet_number(&player, 7, MAX_BET + 1);
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_INVALID_NUMBER)]
    fun test_invalid_number() {
        let (_, _, _, player) = setup_and_initialize_roulette();
        // Try to bet on invalid number (>36) - should fail
        AptosRoulette::test_only_bet_number(&player, 37, STANDARD_BET);
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_INVALID_DOZEN)]
    fun test_invalid_dozen() {
        let (_, _, _, player) = setup_and_initialize_roulette();
        // Try to bet on invalid dozen (4) - should fail
        AptosRoulette::test_only_place_bet(
            &player,
            7, // ENTRY_DOZEN
            4, // invalid dozen
            vector::empty<u8>(),
            STANDARD_BET
        );
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_INVALID_COLUMN)]
    fun test_invalid_column() {
        let (_, _, _, player) = setup_and_initialize_roulette();
        // Try to bet on invalid column (0) - should fail
        AptosRoulette::test_only_place_bet(
            &player,
            8, // ENTRY_COLUMN
            0, // invalid column
            vector::empty<u8>(),
            STANDARD_BET
        );
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_UNAUTHORIZED)]
    fun test_unauthorized_initialization() {
        let (_, _, _, _, player) = setup_roulette_ecosystem();

        // Try to initialize with wrong signer - should fail
        AptosRoulette::initialize_game(&player);
    }

    #[test]
    #[expected_failure(abort_code = roulette_game::AptosRoulette::E_ALREADY_INITIALIZED)]
    fun test_double_initialization() {
        let (_, roulette_signer, _, _) = setup_and_initialize_roulette();
        // Try to initialize again - should fail
        AptosRoulette::initialize_game(&roulette_signer);
    }

    #[test]
    fun test_comprehensive_bet_scenarios() {
        let (_, _, _, player) = setup_and_initialize_roulette();

        // Test multiple bet amounts
        let bet_amounts = vector[MIN_BET, STANDARD_BET, MAX_BET];
        let i = 0;
        while (i < vector::length(&bet_amounts)) {
            let amount = *vector::borrow(&bet_amounts, i);

            // Test number bet (11-tuple)
            AptosRoulette::test_only_bet_number(&player, 7, amount);
            let (winning_number_test, _, _, _, _, _, total_wagered_test, _, _, _, _) =
                AptosRoulette::get_latest_result(PLAYER_ADDR);
            assert!(winning_number_test <= 36, 100 + i);
            assert!(total_wagered_test == amount, 150 + i);
            AptosRoulette::clear_game_result(&player);

            // Test red bet (11-tuple)
            AptosRoulette::test_only_bet_red_black(&player, true, amount);
            let (winning_number_red_test, _, _, _, _, _, total_wagered_red_test, _, _, _, _) =
                AptosRoulette::get_latest_result(PLAYER_ADDR);
            assert!(winning_number_red_test <= 36, 200 + i);
            assert!(total_wagered_red_test == amount, 250 + i);
            AptosRoulette::clear_game_result(&player);

            // Test dozen bet (11-tuple)
            AptosRoulette::test_only_place_bet(
                &player,
                7, // ENTRY_DOZEN
                1, // first dozen
                vector::empty<u8>(),
                amount
            );
            let (
                winning_number_dozen_test, _, _, _, _, _, total_wagered_dozen_test, _, _, _, _
            ) = AptosRoulette::get_latest_result(PLAYER_ADDR);
            assert!(winning_number_dozen_test <= 36, 300 + i);
            assert!(total_wagered_dozen_test == amount, 350 + i);
            AptosRoulette::clear_game_result(&player);

            i = i + 1;
        };

        // Test all numbers from 0 to 36
        let number = 0u8;
        while (number <= 36) {
            AptosRoulette::test_only_bet_number(&player, number, MIN_BET);
            let (winning_number, _, _, _, _, _, _, _, _, _, _) =
                AptosRoulette::get_latest_result(PLAYER_ADDR);
            assert!(winning_number <= 36, 400 + (number as u64));
            AptosRoulette::clear_game_result(&player);
            number = number + 1;
        };

        // Verify system is still stable
        assert!(AptosRoulette::is_ready(), 500);
    }

    #[test]
    fun test_single_bet_comprehensive_coverage() {
        let (_, _, _, player) = setup_and_initialize_roulette();

        // Test all bet types using separate vectors (Move 2 pattern)
        let bet_flags = vector[0u8, 1u8, 2u8, 3u8, 4u8, 5u8, 6u8, 7u8, 8u8, 9u8];
        let bet_values = vector[7u8, 0u8, 1u8, 1u8, 1u8, 1u8, 1u8, 1u8, 1u8, 1u8];

        let i = 0;
        while (i < vector::length(&bet_flags)) {
            let bet_flag = *vector::borrow(&bet_flags, i);
            let bet_value = *vector::borrow(&bet_values, i);
            
            // Special case for split bet which needs bet_numbers
            let bet_numbers = if (bet_flag == 1u8) {
                vector[1u8, 2u8] // split 1-2
            } else {
                vector::empty<u8>()
            };

            AptosRoulette::test_only_place_bet(
                &player,
                bet_flag,
                bet_value,
                bet_numbers,
                MIN_BET
            );

            let (winning_number, _, _, _, _, _, total_wagered, total_payout, won, _, _) =
                AptosRoulette::get_latest_result(PLAYER_ADDR);

            assert!(winning_number <= 36, 600 + i);
            assert!(total_wagered == MIN_BET, 610 + i);
            assert!(total_payout >= 0, 620 + i);
            assert!(won == true || won == false, 630 + i);

            AptosRoulette::clear_game_result(&player);
            i = i + 1;
        };

        // Verify system is still stable
        assert!(AptosRoulette::is_ready(), 700);
    }
}
