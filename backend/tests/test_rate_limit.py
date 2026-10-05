from app.rate_limit import SlidingWindowRateLimit


def test_given_a_client_under_the_limit_when_it_calls_then_every_call_is_allowed():
    limit = SlidingWindowRateLimit(max_calls=3, window_seconds=60)

    assert [limit.allow("1.2.3.4", now=second) for second in (0, 1, 2)] == [True, True, True]


def test_given_a_client_at_the_limit_when_it_calls_again_inside_the_window_then_it_is_refused():
    limit = SlidingWindowRateLimit(max_calls=2, window_seconds=60)
    limit.allow("1.2.3.4", now=0)
    limit.allow("1.2.3.4", now=10)

    assert limit.allow("1.2.3.4", now=59) is False


def test_given_a_refused_client_when_its_oldest_call_leaves_the_window_then_it_may_call_again():
    limit = SlidingWindowRateLimit(max_calls=2, window_seconds=60)
    limit.allow("1.2.3.4", now=0)
    limit.allow("1.2.3.4", now=10)
    limit.allow("1.2.3.4", now=30)

    assert limit.allow("1.2.3.4", now=60) is True
    assert limit.allow("1.2.3.4", now=61) is False


def test_given_one_client_at_the_limit_when_another_calls_then_the_other_is_unaffected():
    limit = SlidingWindowRateLimit(max_calls=1, window_seconds=60)
    limit.allow("1.2.3.4", now=0)

    assert limit.allow("5.6.7.8", now=1) is True


def test_given_a_full_window_when_the_limit_is_reset_then_the_client_may_call_again():
    limit = SlidingWindowRateLimit(max_calls=1, window_seconds=60)
    limit.allow("1.2.3.4", now=0)

    limit.reset()

    assert limit.allow("1.2.3.4", now=1) is True
